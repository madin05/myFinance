const prisma = require('../services/db');

exports.syncUser = async (req, res) => {
  try {
    if (!req.user) throw new Error('Token valid tapi data user tidak terbaca');
    
    const { uid, name: fbName, email: fbEmail, picture } = req.user;
    const { name, email, avatar } = req.body || {}; // Tambahkan || {} biar gak crash kalau body kosong

    console.log('🔄 Syncing user:', fbEmail || uid);

    const userExists = await prisma.user.findUnique({ where: { firebaseUid: uid } });

    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {
        name: name || (userExists ? userExists.name : fbName) || 'User',
        email: email || (userExists ? userExists.email : fbEmail) || '',
        avatar: avatar || (userExists ? userExists.avatar : picture) || ''
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
