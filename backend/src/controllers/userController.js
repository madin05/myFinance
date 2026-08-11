const prisma = require('../services/db');
const { withRetry } = require('../services/db');
const bcrypt = require('bcrypt');
const { sendVerificationEmail } = require('../services/emailService');

exports.syncUser = async (req, res) => {
  try {
    if (!req.user) throw new Error('Token valid tapi data user tidak terbaca');

    const { uid, name: fbName, email: fbEmail, picture } = req.user;
    const { name, email, avatar, password, financialStartDay, currency, balanceOffset } = req.body || {};
    const targetEmail = (email || fbEmail || '').trim().toLowerCase();
    const displayName = name || fbName || 'User';

    console.log('Syncing user:', targetEmail || uid);

    // Hash password jika disertakan (saat registrasi)
    let hashedPass = undefined;
    if (password) {
      hashedPass = await bcrypt.hash(password, 10);
    }

    let user = await withRetry(async () => {
      // 1. Cari user berdasarkan firebaseUid
      let found = await prisma.user.findUnique({
        where: { firebaseUid: uid }
      });

      // 2. Jika belum ada, cari berdasarkan email untuk relink
      if (!found && targetEmail) {
        found = await prisma.user.findFirst({
          where: { email: { equals: targetEmail, mode: 'insensitive' } }
        });
        if (found) {
          console.log('Relinking existing Postgres user by email:', targetEmail);
          try {
            found = await prisma.user.update({
              where: { id: found.id },
              data: { firebaseUid: uid }
            });
          } catch (e) {
            console.warn('Relink update warning:', e.message);
          }
        }
      }

      // 3. Update data user jika sudah ditemukan
      if (found) {
        found = await prisma.user.update({
          where: { id: found.id },
          data: {
            ...(name && { name }),
            ...(email && { email: targetEmail }),
            ...(avatar && { avatar }),
            ...(currency && { currency }),
            ...(financialStartDay !== undefined && { financialStartDay: parseInt(financialStartDay) }),
            ...(balanceOffset !== undefined && { balanceOffset: parseFloat(balanceOffset) })
          }
        });
      } else {
        // 4. Buat user baru
        const safeEmail = targetEmail || `user_${uid.slice(0, 10)}@myfinance.local`;
        try {
          found = await prisma.user.create({
            data: {
              firebaseUid: uid,
              name: displayName,
              email: safeEmail,
              avatar: avatar || picture || '',
              currency: currency || 'IDR',
              password: hashedPass
            }
          });
        } catch (createErr) {
          // Fallback: race-condition unique constraint
          found = await prisma.user.findFirst({
            where: {
              OR: [
                { firebaseUid: uid },
                ...(targetEmail ? [{ email: { equals: targetEmail, mode: 'insensitive' } }] : [])
              ]
            }
          });
        }
      }

      return found;
    });

    if (!user) throw new Error('Gagal memproses data user');

    console.log('User Synced Successfully:', user.email);
    res.json(user);
  } catch (error) {
    console.error('CRASH di syncUser:', error.message);
    res.status(500).json({
      error: 'Backend lagi error bre!',
      message: error.message
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { uid } = req.user;

    const user = await withRetry(() =>
      prisma.user.findUnique({ where: { firebaseUid: uid } })
    );

    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Verifikasi password lama jika user sudah punya password
    if (user.password) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Password lama tidak sesuai' });
      }
    }

    const hashedNewPass = await bcrypt.hash(newPassword, 10);

    await withRetry(() =>
      prisma.user.update({
        where: { firebaseUid: uid },
        data: { password: hashedNewPass }
      })
    );

    res.json({ message: 'Password berhasil diubah, silakan login ulang' });
  } catch (error) {
    console.error('Update Password Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { uid } = req.user;
    await withRetry(() =>
      prisma.user.delete({ where: { firebaseUid: uid } })
    );
    res.json({ message: 'Akun dan seluruh data finansial berhasil dihapus' });
  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({ error: 'Gagal hapus akun bre! ' + error.message });
  }
};

/**
 * Kirim email verifikasi via backend (nodemailer + Gmail).
 * Solusi untuk Firebase Client SDK yang ter-rate-limit.
 */
exports.sendVerification = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(400).json({ error: 'Email tidak ditemukan di token.' });
    }

    const reqOrigin = req.headers.origin || req.headers.referer;

    // Kirim respon HTTP 200 instan ke UI (non-blocking)
    res.json({ success: true, message: 'Email verifikasi berhasil dikirim!' });

    // Kirim email via Nodemailer di background
    sendVerificationEmail(email, reqOrigin).catch(err => {
      console.error('Background Send Verification Error:', err.message);
    });
  } catch (error) {
    console.error('Send Verification Error:', error.message);
    res.status(500).json({ error: error.message || 'Gagal kirim email verifikasi.' });
  }
};
