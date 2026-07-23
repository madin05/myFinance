const prisma = require('../services/db');
const bcrypt = require('bcrypt');
const { sendVerificationEmail } = require('../services/emailService');

exports.syncUser = async (req, res) => {
  try {
    if (!req.user) throw new Error('Token valid tapi data user tidak terbaca');
    
    const { uid, name: fbName, email: fbEmail, picture } = req.user;
    const { name, email, avatar, password, financialStartDay, currency, balanceOffset } = req.body || {}; 

    console.log('Syncing user:', fbEmail || uid);

    // Hash password if provided (during registration)
    let hashedPass = undefined;
    if (password) {
      hashedPass = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {
        ...(name && { name }),
        ...(email && { email }),
        ...(avatar && { avatar }),
        ...(currency && { currency }),
        ...(financialStartDay !== undefined && { financialStartDay: parseInt(financialStartDay) }),
        ...(balanceOffset !== undefined && { balanceOffset: parseFloat(balanceOffset) })
        // Jangan update password di sini, pakai updatePassword route
      },
      create: {
        firebaseUid: uid,
        name: name || fbName || 'User',
        email: email || fbEmail || '',
        avatar: avatar || picture || '',
        currency: currency || 'IDR',
        password: hashedPass
      }
    });

    console.log('User Synced:', user.email);
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

    const user = await prisma.user.findUnique({
      where: { firebaseUid: uid }
    });

    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Verifikasi password lama jika ada
    if (user.password) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Password lama tidak sesuai' });
      }
    } else {
      // Jika user belum punya password (login google), 
      // kita izinkan set password baru pertama kali tanpa cek password lama (karena ga ada)
      // tapi biasanya fieldnya tetep harus diisi (dummy/confirm)
    }

    const hashedNewPass = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { firebaseUid: uid },
      data: { password: hashedNewPass }
    });

    res.json({ message: 'Password berhasil diubah, silakan login ulang' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { uid } = req.user;
    await prisma.user.delete({
      where: { firebaseUid: uid }
    });
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

    // ⚡ Kirim respon HTTP 200 INSTAN ke UI (tanpa nunggu SMTP latency)
    res.json({ success: true, message: 'Email verifikasi berhasil dikirim!' });

    // 🚀 Kirim email via Nodemailer di background secara non-blocking
    sendVerificationEmail(email).catch(err => {
      console.error('Background Send Verification Error:', err.message);
    });
  } catch (error) {
    console.error('Send Verification Error:', error.message);
    res.status(500).json({ error: error.message || 'Gagal kirim email verifikasi.' });
  }
};
