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

    // Auto-clean: jika terdapat duplikasi akun di PostgreSQL (misal akibat sync race-condition),
    // deduplikasi dan bersihkan record duplikat yang berlebih dari DB.
    const uniqueMap = new Map();
    const duplicateIds = [];

    for (const acc of accounts) {
      const key = (acc.name || '').trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, acc);
      } else {
        const existing = uniqueMap.get(key);
        duplicateIds.push(acc.id);
        if (Number(existing.balance || 0) === 0 && Number(acc.balance || 0) !== 0) {
          existing.balance = acc.balance;
        }
      }
    }

    if (duplicateIds.length > 0) {
      prisma.account.deleteMany({
        where: { id: { in: duplicateIds }, userId }
      }).catch(err => console.warn('[Account] Gagal membersihkan row duplikat:', err.message));
    }

    res.json(Array.from(uniqueMap.values()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE akun baru
exports.createAccount = async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { name, type, balance, logo } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nama akun wajib diisi' });
    }

    const cleanName = name.trim();

    // Cek apakah akun dengan nama yang sama sudah ada untuk mencegah duplikasi saldo
    const existing = await prisma.account.findFirst({
      where: {
        userId,
        name: { equals: cleanName, mode: 'insensitive' }
      }
    });

    if (existing) {
      const updated = await prisma.account.update({
        where: { id: existing.id },
        data: {
          balance: parseFloat(balance) || 0,
          ...(type !== undefined ? { type } : {}),
          ...(logo !== undefined ? { logo } : {})
        }
      });
      return res.status(200).json(updated);
    }

    const count = await prisma.account.count({ where: { userId } });
    const account = await prisma.account.create({
      data: {
        userId,
        name: cleanName,
        type: type || 'Bank',
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

    // Deduplikasi accounts di payload sebelum disimpan ke DB
    const uniqueMap = new Map();
    for (const a of accounts) {
      if (!a || !a.name) continue;
      const key = (a.name || '').trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, a);
      } else {
        const existing = uniqueMap.get(key);
        if (Number(existing.balance || 0) === 0 && Number(a.balance || 0) !== 0) {
          existing.balance = a.balance;
        }
      }
    }

    const uniqueList = Array.from(uniqueMap.values());

    // Jalankan dalam $transaction atomik agar aman dari race-condition concurrent sync
    await prisma.$transaction(async (tx) => {
      await tx.account.deleteMany({ where: { userId } });
      if (uniqueList.length > 0) {
        await tx.account.createMany({
          data: uniqueList.map((a, idx) => ({
            userId,
            name: a.name,
            type: a.type || 'Bank',
            balance: parseFloat(a.balance) || 0,
            logo: a.logo || '',
            orderIndex: a.orderIndex ?? idx
          }))
        });
      }
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
