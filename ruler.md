Alur verifikasi OTP via email membagi proses pendaftaran menjadi dua tahap: registrasi data awal (status unverified) dan validasi kode OTP untuk aktivasi akun.

1. Skema Database

Tambahkan kolom atau tabel khusus untuk melacak status dan token OTP:

Tabel users: Tambahkan kolom is_verified (BOOLEAN, default false) dan verified_at (TIMESTAMP, nullable).

Tabel otp_verifications:

id (UUID / Primary Key)

user_id (Foreign Key ke users.id)

otp_code (VARCHAR/HASH, 6 digit)

expires_at (TIMESTAMP, set 5-10 menit dari waktu kirim)

attempts (INT, default 0, buat batasan salah input)

2. Alur Kerja Sistem (Flowchart Logic)

Step 1: Registrasi

User mengisi form register (nama, email, password).

Backend menyimpan data user ke tabel users dengan is_verified = false.

Backend men-generate 6-digit angka random kriptografis (misal: crypto.randomInt(100000, 999999)).

Simpan OTP (disarankan dalam bentuk hash) ke database beserta waktu expired (contoh: NOW() + INTERVAL '5 MINUTE').

Kirim email berisi kode OTP (gunakan service seperti Resend, SendGrid, atau Nodemailer/SMTP).

Backend merespons status sukses, lalu frontend mengarahkan user ke halaman /verify-otp?email=....

Step 2: Verifikasi Kode

User memasukkan 6-digit kode di UI.

Frontend menembak endpoint POST /api/auth/verify-otp membawa payload { email, otp }.

Backend memvalidasi:

Cek apakah OTP cocok dengan data di database.

Cek apakah waktu saat ini melewati expires_at.

Cek apakah user sudah gagal lebih dari limit (misal: max 3x salah).

Jika valid:

Update users.is_verified = true.

Hapus OTP dari tabel verifikasi (atau tandai is_used = true).

Generate session/JWT token dan kirim ke frontend.

Redirect user ke /dashboard.

Jika tidak valid/expired: Kembalikan response error sesuai kondisi (OTP salah / kedaluwarsa).

Step 3: Fitur Resend OTP

Endpoint POST /api/auth/resend-otp dengan proteksi rate limit (beri jeda countdown 60 detik di UI dan backend) agar email tidak disalahgunakan / spam.

3. Pertimbangan Keamanan & Best Practice

Hash Kode OTP: Simpan kode OTP di database menggunakan hashing ringan (misal SHA-256) agar jika database bocor, kode tidak terbaca secara plaintext.

Rate Limiting: Batasi request pengiriman OTP (maksimal 3-5 request per jam per IP/email) untuk menghemat kuota email provider dan mencegah abuse.

Auth Guard Middleware: Pastikan endpoint dashboard dan fitur utama menolak request jika user token memiliki status is_verified: false.