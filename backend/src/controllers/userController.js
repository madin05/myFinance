const prisma = require('../services/db');

exports.syncUser = async (req, res) => {
  try {
    if (!req.user) throw new Error('Token valid tapi data user tidak terbaca');
    
    const { uid, name: fbName, email: fbEmail, picture } = req.user;
    const { name, email, avatar } = req.body || {}; // Tambahkan || {} biar gak crash kalau body kosong

    console.log('🔄 Syncing user:', fbEmail || uid);

    // Langsung UPSERT biar cuma 1x panggil DB (lebih kenceng)
    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {
        // Cuma update kalau ada data baru yang dikirim di body
        // Kalau sync biasa (refresh), body kosong, jadi data di DB tetep aman
        ...(name && { name }),
        ...(email && { email }),
        ...(avatar && { avatar })
      },
      create: {
        firebaseUid: uid,
        name: name || fbName || 'User',
        email: email || fbEmail || '',
        avatar: avatar || picture || ''
      }
    });

    console.log('✅ User Synced:', user.email);
    res.json(user);
  } catch (error) {
    console.error('❌ CRASH di syncUser:', error.message);
    res.status(500).json({ 
      error: 'Backend lagi error bre!', 
      message: error.message 
    });
  }
};
