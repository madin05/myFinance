const prisma = require('../services/db');
const { withRetry } = require('../services/db');

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

exports.getBudgets = async (req, res) => {
  try {
    const { period } = req.query;
    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User tidak ditemukan' });

    const whereClause = period ? { userId, period: String(period) } : { userId };

    const budgets = await withRetry(() => prisma.budget.findMany({
      where: whereClause,
      orderBy: [{ period: 'desc' }, { id: 'asc' }]
    }));
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upsertBudget = async (req, res) => {
  try {
    const { category, amount, period } = req.body;

    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User tidak ditemukan' });

    const targetPeriod = (period && String(period).trim()) || new Date().toISOString().slice(0, 7);
    const cleanCategory = String(category || '').trim();
    if (!cleanCategory) {
      return res.status(400).json({ error: 'Kategori anggaran wajib diisi' });
    }

    const budget = await withRetry(() => prisma.budget.upsert({
      where: {
        userId_category_period: {
          userId,
          category: cleanCategory,
          period: targetPeriod
        }
      },
      update: { amount: parseFloat(amount) || 0 },
      create: {
        userId,
        category: cleanCategory,
        amount: parseFloat(amount) || 0,
        period: targetPeriod
      }
    }));
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID anggaran tidak valid' });

    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User tidak ditemukan' });

    const deleted = await withRetry(() => prisma.budget.deleteMany({
      where: { id, userId }
    }));

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Anggaran tidak ditemukan' });
    }
    res.json({ message: 'Anggaran berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
