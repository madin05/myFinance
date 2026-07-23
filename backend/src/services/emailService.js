require('dotenv').config();
const nodemailer = require('nodemailer');
const admin = require('./firebase');

/**
 * Optimized pooled transporter untuk Gmail SMTP.
 * Menggunakan connection pool (pool: true) agar koneksi TLS/TCP tetap terbuka
 * dan pengiriman email berulang jauh lebih cepat tanpa SSL handshake dari awal.
 */
let cachedTransporter = null;

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return cachedTransporter;
};

/**
 * Kirim email verifikasi ke user menggunakan Firebase Admin SDK.
 * Firebase Admin generate link verifikasi yang valid, lalu dikirim via nodemailer.
 * Tidak ada rate-limit dari sisi kita.
 *
 * @param {string} email - Email user yang akan diverifikasi
 * @returns {Promise<void>}
 */
exports.sendVerificationEmail = async (email) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  // Cek ketersediaan user di Firebase Auth terlebih dahulu
  try {
    await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const errorObj = new Error('Email tidak terdaftar di sistem.');
      errorObj.code = 'auth/user-not-found';
      throw errorObj;
    }
    throw err;
  }

  // Generate link verifikasi via Firebase Admin SDK (tidak ada limit!)
  const verificationLink = await admin.auth().generateEmailVerificationLink(email, {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    handleCodeInApp: false,
  });

  const transporter = getTransporter();

  const mailOptions = {
    from: `"MyFinance" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Verifikasi Email Akun MyFinance Kamu 🎉',
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifikasi Email MyFinance</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:36px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                      💰 MyFinance
                    </h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                      Kelola keuanganmu lebih cerdas & aman
                    </p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">
                      Verifikasi Email Kamu 👋
                    </h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                      Terima kasih sudah daftar di <strong>MyFinance</strong>! 
                      Satu langkah lagi — klik tombol di bawah untuk verifikasi emailmu dan aktifkan akun sepenuhnya.
                    </p>
                    
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                      <tr>
                        <td align="center" style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:12px;">
                          <a href="${verificationLink}" 
                             style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                            ✓ Verifikasi Email Sekarang
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative link -->
                    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                        Atau salin link ini ke browser:
                      </p>
                      <p style="margin:0;color:#6366f1;font-size:12px;word-break:break-all;line-height:1.5;">
                        ${verificationLink}
                      </p>
                    </div>
                    
                    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                      Link ini akan kedaluwarsa dalam <strong>24 jam</strong>. 
                      Jika kamu tidak mendaftar di MyFinance, abaikan email ini.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © 2026 MyFinance · Email ini dikirim otomatis, jangan dibalas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Verification email sent to: ${email}`);
};

/**
 * Kirim email reset password ke user menggunakan Firebase Admin SDK + Nodemailer.
 *
 * @param {string} email - Email user yang akan direset passwordnya
 * @returns {Promise<void>}
 */
exports.sendPasswordResetEmail = async (email) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  // Cek ketersediaan user di Firebase Auth terlebih dahulu agar tidak memicu internal assertion error
  try {
    await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const errorObj = new Error('Email tidak terdaftar di sistem.');
      errorObj.code = 'auth/user-not-found';
      throw errorObj;
    }
    throw err;
  }

  // Generate link reset password via Firebase Admin SDK
  const resetLink = await admin.auth().generatePasswordResetLink(email, {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  });

  const transporter = getTransporter();

  const mailOptions = {
    from: `"MyFinance" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Atur Ulang Password Akun MyFinance Kamu 🔑',
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password MyFinance</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:36px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                      💰 MyFinance
                    </h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                      Atur Ulang Kata Sandi
                    </p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">
                      Lupa Kata Sandi? 🔑
                    </h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                      Kami menerima permintaan untuk mengubah kata sandi akun MyFinance kamu. Klik tombol di bawah untuk membuat kata sandi baru.
                    </p>
                    
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                      <tr>
                        <td align="center" style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:12px;">
                          <a href="${resetLink}" 
                             style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                            🔑 Reset Password Sekarang
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative link -->
                    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                        Atau salin link ini ke browser:
                      </p>
                      <p style="margin:0;color:#6366f1;font-size:12px;word-break:break-all;line-height:1.5;">
                        ${resetLink}
                      </p>
                    </div>
                    
                    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                      Jika kamu tidak pernah meminta reset password, abaikan email ini dan akun kamu akan tetap aman.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © 2026 MyFinance · Email ini dikirim otomatis, jangan dibalas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Password reset email sent to: ${email}`);
};

