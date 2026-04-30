const prisma = require('../services/db');

exports.getAllTransactions = async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { amount, harga, category, kategori, method, metode, description, keterangan, type, tanggal, date } = req.body;
    const { uid } = req.user;

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    // Gunakan amount, kalau kosong coba harga (biar fleksibel)
    const finalAmount = parseFloat(amount || harga || 0);

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: finalAmount,
        category: category || kategori || 'Umum',
        method: method || metode || 'Cash',
        description: description || keterangan || '',
        type: type || 'expense',
        date: tanggal ? new Date(tanggal) : (date ? new Date(date) : new Date())
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error('❌ Gagal Simpan Transaksi:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { uid } = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id tidak valid' });

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    const tx = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    await prisma.transaction.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Gagal Hapus Transaksi:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { uid } = req.user;
    const id = Number(req.params.id);
    const { amount, harga, category, kategori, method, metode, description, keterangan, type, tanggal, date } = req.body;

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return res.status(404).json({ error: 'User belum terdaftar' });

    const tx = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const finalAmount = parseFloat(amount || harga || tx.amount);

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        amount: finalAmount,
        category: category || kategori || tx.category,
        method: method || metode || tx.method,
        description: description || keterangan || tx.description,
        type: type || tx.type,
        date: tanggal ? new Date(tanggal) : (date ? new Date(date) : tx.date)
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('❌ Gagal Update Transaksi:', error.message);
    res.status(400).json({ error: error.message });
  }
};
