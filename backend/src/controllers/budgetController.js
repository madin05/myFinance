const prisma = require('../services/db');

async function getDbUserId(uid) {
  const user = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    select: { id: true }
  });
  return user?.id || null;
}

exports.getBudgets = async (req, res) => {
  try {
    const { uid } = req.user;
    const { period } = req.query;

    const userId = await getDbUserId(uid);
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
    const { uid } = req.user;
    const { category, amount, period } = req.body;

    const userId = await getDbUserId(uid);
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
