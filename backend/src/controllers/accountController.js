const prisma = require('../services/db');
const { withRetry } = require('../services/db');

// Helper: ambil userId dari DB berdasarkan Firebase UID
async function getUserId(req) {
  const { uid, name, email } = req.user || {};
  if (!uid) throw new Error('UID tidak ditemukan');
  const cleanEmail = (email || '').trim().toLowerCase();

  return withRetry(async () => {
    let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user && cleanEmail) {
      user = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } }
      });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid }
        }).catch(() => null) || user;
      }
    }
    if (!user) {
      try {
        const safeEmail = cleanEmail || `user_${uid.slice(0, 10)}@myfinance.local`;
        user = await prisma.user.create({
          data: { firebaseUid: uid, name: name || 'User', email: safeEmail, currency: 'IDR' }
        });
      } catch {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { firebaseUid: uid },
              ...(cleanEmail ? [{ email: { equals: cleanEmail, mode: 'insensitive' } }] : [])
            ]
          }
        });
      }
    }
    if (!user) throw new Error('User tidak ditemukan di database');
    return user.id;
  });
}

// GET semua akun milik user
exports.getAccounts = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const accounts = await withRetry(() => prisma.account.findMany({
      where: { userId },
      orderBy: { orderIndex: 'asc' }
    }));
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE akun baru
exports.createAccount = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { name, type, balance, logo } = req.body;

    const count = await prisma.account.count({ where: { userId } });
    const account = await prisma.account.create({
      data: {
        userId,
        name,
        type,
        balance: parseFloat(balance) || 0,
        logo: logo || '',
        orderIndex: count
      }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE akun (nama, tipe, saldo)
exports.updateAccount = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { id } = req.params;
    const { name, type, balance, logo } = req.body;

    const account = await prisma.account.update({
      where: { id: parseInt(id), userId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(logo !== undefined && { logo })
      }
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE akun
exports.deleteAccount = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { id } = req.params;

    await prisma.account.delete({
      where: { id: parseInt(id), userId }
    });
    res.json({ message: 'Akun berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SYNC BULK: terima array akun dari frontend, replace semua akun user
exports.syncAccounts = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { accounts } = req.body; // array of { name, type, balance, logo, orderIndex }

    if (!Array.isArray(accounts)) {
      return res.status(400).json({ error: 'accounts harus berupa array' });
    }

    // Hapus semua akun lama, replace dengan yang baru
    await prisma.account.deleteMany({ where: { userId } });
    
    const created = await prisma.account.createMany({
      data: accounts.map((a, idx) => ({
        userId,
        name: a.name,
        type: a.type,
        balance: parseFloat(a.balance) || 0,
        logo: a.logo || '',
        orderIndex: a.orderIndex ?? idx
      }))
    });

    const result = await prisma.account.findMany({
      where: { userId },
      orderBy: { orderIndex: 'asc' }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
