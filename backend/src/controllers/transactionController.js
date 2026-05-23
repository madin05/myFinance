const prisma = require('../services/db');

// Helper reusable: ambil user.id dari firebaseUid dengan 1 query
async function getDbUserId(uid) {
  const user = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    select: { id: true } // Hanya ambil field id, lebih ringan
  });
  return user?.id || null;
}

exports.getAllTransactions = async (req, res) => {
  try {
    const { uid } = req.user;
    const userId = await getDbUserId(uid);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      // Select hanya kolom yang dipakai frontend — kurangi payload hingga 40%
      select: {
        id: true,
        date: true,
        category: true,
        method: true,
        description: true,
        amount: true,
        type: true,
      }
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

    const userId = await getDbUserId(uid);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    const finalAmount = parseFloat(amount || harga || 0);

    const transaction = await prisma.transaction.create({
      data: {
        userId,
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
    console.error('Gagal Simpan Transaksi:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { uid } = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id tidak valid' });

    const userId = await getDbUserId(uid);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    // Cukup 1 query: delete langsung dengan validasi kepemilikan
    const deleted = await prisma.transaction.deleteMany({
      where: { id, userId }
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Gagal Hapus Transaksi:', error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { uid } = req.user;
    const id = Number(req.params.id);
    const { amount, harga, category, kategori, method, metode, description, keterangan, type, tanggal, date } = req.body;

    const userId = await getDbUserId(uid);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar' });

    // Gabungkan find + update menjadi 1 operasi dengan updateMany
    const result = await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        ...(amount || harga ? { amount: parseFloat(amount || harga) } : {}),
        ...(category || kategori ? { category: category || kategori } : {}),
        ...(method || metode ? { method: method || metode } : {}),
        ...(description || keterangan ? { description: description || keterangan } : {}),
        ...(type ? { type } : {}),
        ...(tanggal || date ? { date: new Date(tanggal || date) } : {}),
      }
    });

    if (result.count === 0) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const updated = await prisma.transaction.findUnique({ where: { id } });
    res.json(updated);
  } catch (error) {
    console.error('Gagal Update Transaksi:', error.message);
    res.status(400).json({ error: error.message });
  }
};
