const prisma = require('../services/db');
const { withRetry } = require('../services/db');

// Helper reusable: ambil user.id dari firebaseUid dengan 1 query
async function getDbUserId(userPayload) {
  if (!userPayload) return null;
  const uid = typeof userPayload === 'string' ? userPayload : userPayload?.uid;
  if (!uid) return null;
  const email = (typeof userPayload === 'object' ? userPayload.email : '') || '';
  const cleanEmail = email.trim().toLowerCase();

  return withRetry(async () => {
    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
      select: { id: true }
    });

    if (!user && cleanEmail) {
      user = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
        select: { id: true }
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid }
        }).catch(() => {});
      }
    }

    if (!user) {
      try {
        const name = typeof userPayload === 'object' ? (userPayload.name || 'User') : 'User';
        const safeEmail = cleanEmail || `user_${uid.slice(0, 10)}@myfinance.local`;
        user = await prisma.user.create({
          data: {
            firebaseUid: uid,
            name,
            email: safeEmail,
            currency: 'IDR'
          },
          select: { id: true }
        });
      } catch (e) {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { firebaseUid: uid },
              ...(cleanEmail ? [{ email: { equals: cleanEmail, mode: 'insensitive' } }] : [])
            ]
          },
          select: { id: true }
        });
      }
    }

    return user?.id || null;
  });
}

exports.getAllTransactions = async (req, res) => {
  try {
    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    const transactions = await withRetry(() => prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        category: true,
        method: true,
        account: true,
        description: true,
        amount: true,
        type: true,
      }
    }));
    res.json(transactions);
  } catch (error) {
    console.error('Gagal Ambil Transaksi:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { amount, harga, category, kategori, method, metode, account, akun, description, keterangan, type, tanggal, date } = req.body;
    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar di Postgres' });

    const finalAmount = parseFloat(amount || harga || 0);

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: finalAmount,
        category: category || kategori || 'Umum',
        method: method || metode || 'Cash',
        account: account || akun || null,
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
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id tidak valid' });

    const userId = await getDbUserId(req.user);
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
    const id = Number(req.params.id);
    const { amount, harga, category, kategori, method, metode, account, akun, description, keterangan, type, tanggal, date } = req.body;

    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User belum terdaftar' });

    // Gabungkan find + update menjadi 1 operasi dengan updateMany
    const result = await prisma.transaction.updateMany({
      where: { id, userId },
      data: {
        ...(amount || harga ? { amount: parseFloat(amount || harga) } : {}),
        ...(category || kategori ? { category: category || kategori } : {}),
        ...(method || metode ? { method: method || metode } : {}),
        ...((account !== undefined || akun !== undefined) ? { account: account || akun || null } : {}),
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
