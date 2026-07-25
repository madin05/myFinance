const prisma = require('../services/db');

async function getAuthedUser(req) {
  const { uid, name, email } = req.user || {};
  if (!uid) throw new Error('UID tidak ditemukan dari token');
  const cleanEmail = (email || '').trim().toLowerCase();

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
  if (!user) {
    const err = new Error('User belum terdaftar di Postgres');
    err.statusCode = 404;
    throw err;
  }
  return user;
}

exports.getAllSavings = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    const savings = await prisma.saving.findMany({
      where: { userId: user.id },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
    });
    res.json(savings);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.createSaving = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    const { name, targetAmount, currentAmount, icon, color } = req.body || {};

    if (!name) return res.status(400).json({ error: 'name wajib diisi' });
    const target = Number(targetAmount || 0);
    if (!Number.isFinite(target) || target <= 0) {
      return res.status(400).json({ error: 'targetAmount wajib > 0' });
    }

    const maxOrder = await prisma.saving.aggregate({
      where: { userId: user.id },
      _max: { orderIndex: true }
    });
    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const saving = await prisma.saving.create({
      data: {
        userId: user.id,
        name,
        targetAmount: target,
        currentAmount: Number(currentAmount || 0),
        icon: icon || 'ph-heart',
        color: color || 'bg-primary',
        orderIndex: nextOrder
      }
    });

    res.status(201).json(saving);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.updateSaving = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id tidak valid' });

    const { name, targetAmount, currentAmount, icon, color } = req.body || {};

    const existing = await prisma.saving.findFirst({ where: { id, userId: user.id } });
    if (!existing) return res.status(404).json({ error: 'Saving tidak ditemukan' });

    const data = {};
    if (typeof name === 'string') data.name = name;
    if (typeof icon === 'string') data.icon = icon;
    if (typeof color === 'string') data.color = color;

    if (targetAmount !== undefined) {
      const target = Number(targetAmount);
      if (!Number.isFinite(target) || target <= 0) return res.status(400).json({ error: 'targetAmount tidak valid' });
      data.targetAmount = target;
    }

    if (currentAmount !== undefined) {
      const cur = Number(currentAmount);
      if (!Number.isFinite(cur) || cur < 0) return res.status(400).json({ error: 'currentAmount tidak valid' });
      data.currentAmount = cur;
    }

    if (req.body.isDone !== undefined) {
      data.isDone = Boolean(req.body.isDone);
    }

    const saving = await prisma.saving.update({
      where: { id },
      data
    });

    res.json(saving);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.deleteSaving = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id tidak valid' });

    const existing = await prisma.saving.findFirst({ where: { id, userId: user.id } });
    if (!existing) return res.status(404).json({ error: 'Saving tidak ditemukan' });

    await prisma.saving.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.reorderSavings = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    const { orderedIds } = req.body || {};
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds wajib array' });
    }

    const ids = orderedIds.map(Number).filter(Number.isFinite);
    if (ids.length !== orderedIds.length) return res.status(400).json({ error: 'orderedIds tidak valid' });

    const existing = await prisma.saving.findMany({ where: { userId: user.id }, select: { id: true } });
    const existingSet = new Set(existing.map(s => s.id));
    const validIds = ids.filter(id => existingSet.has(id));

    if (validIds.length > 0) {
      await prisma.$transaction(
        validIds.map((id, idx) =>
          prisma.saving.update({
            where: { id },
            data: { orderIndex: idx }
          })
        )
      );
    }

    const savings = await prisma.saving.findMany({
      where: { userId: user.id },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
    });
    res.json(savings);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

