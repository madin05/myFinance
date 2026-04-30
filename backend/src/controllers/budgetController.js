const prisma = require('../services/db');

exports.getBudgets = async (req, res) => {
  try {
    const { uid } = req.user;
    const { period } = req.query; // Format: 2024-04

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
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

    const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const budget = await prisma.budget.upsert({
      where: {
        userId_category_period: {
          userId: user.id,
          category,
          period: period || new Date().toISOString().slice(0, 7)
        }
      },
      update: { amount: parseFloat(amount) },
      create: {
        userId: user.id,
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
