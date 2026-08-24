Standar Alur yang Benar & Aman

Untuk aplikasi finansial, alur aktivasi dan penonaktifan fitur keamanan wajib melewati Challenge-Response:

1. Alur Aktifin (Harus Test OTP Dulu)

User geser switch ke posisi ON.

Sistem JANGAN langsung ubah twoFactorEmailEnabled = true.

Buka modal popup: "Kami mengirimkan 6-digit kode verifikasi ke email lu untuk memastikan email aktif".

Backend generate & kirim OTP bertipe ENABLE_2FA.

User input 6 digit kode di modal -> Submit ke backend.

Backend validasi: Jika benar, barulah update status di DB jadi twoFactorEmailEnabled = true.

2. Alur Matiin (Konfirmasi Password / OTP)

User geser switch ke posisi OFF.

Muncul modal konfirmasi: "Masukkan Password akun Anda untuk menonaktifkan 2FA".

User submit password -> Backend verifikasi bcrypt.compare(password, user.passwordHash).

Jika cocok, ubah status di DB jadi twoFactorEmailEnabled = false.