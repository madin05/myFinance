const prisma = require('../services/db');

async function getDbUserId(userPayload) {
  const uid = typeof userPayload === 'string' ? userPayload : userPayload?.uid;
  if (!uid) return null;

  let user = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    select: { id: true }
  });

  if (!user && typeof userPayload === 'object' && userPayload.email) {
    user = await prisma.user.findFirst({
      where: { email: userPayload.email },
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
      const email = typeof userPayload === 'object' ? (userPayload.email || '') : '';
      const name = typeof userPayload === 'object' ? (userPayload.name || 'User') : 'User';
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          name,
          email,
          currency: 'IDR'
        },
        select: { id: true }
      });
    } catch (e) {
      user = await prisma.user.findUnique({
        where: { firebaseUid: uid },
        select: { id: true }
      });
    }
  }

  return user?.id || null;
}

exports.getBudgets = async (req, res) => {
  try {
    const { period } = req.query;
    const userId = await getDbUserId(req.user);
    if (!userId) return res.status(404).json({ error: 'User tidak ditemukan' });

    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        period: period || new Date().toISOString().slice(0, 7)
      }
    });
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

    const budget = await prisma.budget.upsert({
      where: {
        userId_category_period: {
          userId,
          category,
          period: period || new Date().toISOString().slice(0, 7)
        }
      },
      update: { amount: parseFloat(amount) },
      create: {
        userId,
        category,
        amount: parseFloat(amount),
        period: period || new Date().toISOString().slice(0, 7)
      }
    });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.budget.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Anggaran berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
