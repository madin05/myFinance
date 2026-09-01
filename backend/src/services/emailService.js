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
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS for fast connection setup
      pool: true,
      maxConnections: 10,
      maxMessages: 200,
      rateDelta: 1000,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return cachedTransporter;
};

// Pre-warm SMTP pool on server start
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  getTransporter();
}

/**
 * Kirim email verifikasi ke user menggunakan Firebase Admin SDK.
 * Firebase Admin generate link verifikasi yang valid, lalu dikirim via nodemailer.
 * Tidak ada rate-limit dari sisi kita.
 *
 * @param {string} email - Email user yang akan diverifikasi
 * @returns {Promise<void>}
 */
exports.sendVerificationEmail = async (email, reqOrigin = null) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  // Generate link verifikasi via Firebase Admin SDK (langsung tangkap jika user tidak ada)
  let actionLink;
  try {
    actionLink = await admin.auth().generateEmailVerificationLink(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const errorObj = new Error('Email tidak terdaftar di sistem.');
      errorObj.code = 'auth/user-not-found';
      throw errorObj;
    }
    throw err;
  }

  // Parse oobCode untuk membuat direct deep-link ke frontend (Bypass Firebase Console)
  const urlObj = new URL(actionLink);
  const oobCode = urlObj.searchParams.get('oobCode');
  
  let frontendUrl = process.env.FRONTEND_URL;
  if ((!frontendUrl || frontendUrl.includes('localhost')) && reqOrigin) {
    try {
      frontendUrl = new URL(reqOrigin).origin;
    } catch (e) {}
  }
  frontendUrl = frontendUrl || 'http://localhost:5173';

  const verificationLink = `${frontendUrl}/?mode=verifyEmail&oobCode=${oobCode}`;

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
                        <td align="center" style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:50px;">
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
 * Kirim email berisi 6-digit OTP code ke user.
 * Dipakai saat registrasi akun baru (mengganti link verifikasi).
 *
 * @param {string} email - Email tujuan
 * @param {string} otpCode - 6-digit OTP plaintext
 * @returns {Promise<void>}
 */
exports.sendOtpVerificationEmail = async (email, otpCode) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  const transporter = getTransporter();

  // Format OTP digits dengan spacing untuk tampilan premium
  const digits = otpCode.split('').map(d =>
    `<td style="width:48px;height:56px;background:#f1f5f9;border:2px solid #e2e8f0;border-radius:10px;text-align:center;vertical-align:middle;font-size:28px;font-weight:800;color:#1e293b;font-family:'Segoe UI',monospace;letter-spacing:0;">${d}</td>`
  ).join('<td style="width:8px;"></td>');

  const mailOptions = {
    from: `"MyFinance" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Kode Verifikasi Akun MyFinance Kamu 🔐',
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kode Verifikasi OTP MyFinance</title>
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
                      Verifikasi Akun Baru
                    </p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">
                      Kode Verifikasi OTP 🔐
                    </h2>
                    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
                      Masukkan kode 6-digit berikut di halaman verifikasi MyFinance untuk mengaktifkan akunmu.
                    </p>
                    
                    <!-- OTP Code Display -->
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                      <tr>
                        ${digits}
                      </tr>
                    </table>
                    
                    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
                      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
                        Kode ini berlaku selama <strong style="color:#6366f1;">5 menit</strong>.<br>
                        Jangan bagikan kode ini kepada siapapun.
                      </p>
                    </div>
                    
                    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
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
  console.log(`✅ OTP verification email sent to: ${email}`);
};

/**
 * Kirim email reset password ke user menggunakan Firebase Admin SDK + Nodemailer.
 *
 * @param {string} email - Email user yang akan direset passwordnya
 * @returns {Promise<void>}
 */
exports.sendPasswordResetEmail = async (email, reqOrigin = null) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  // Generate link reset password via Firebase Admin SDK (langsung tangkap jika user tidak ada)
  let actionLink;
  try {
    actionLink = await admin.auth().generatePasswordResetLink(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const errorObj = new Error('Email tidak terdaftar di sistem.');
      errorObj.code = 'auth/user-not-found';
      throw errorObj;
    }
    throw err;
  }
  
  // Parse oobCode untuk membuat direct deep-link ke frontend
  const urlObj = new URL(actionLink);
  const oobCode = urlObj.searchParams.get('oobCode');
  
  let frontendUrl = process.env.FRONTEND_URL;
  if ((!frontendUrl || frontendUrl.includes('localhost')) && reqOrigin) {
    try {
      frontendUrl = new URL(reqOrigin).origin;
    } catch (e) {}
  }
  frontendUrl = frontendUrl || 'http://localhost:5173';

  const resetLink = `${frontendUrl}/?mode=resetPassword&oobCode=${oobCode}`;

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
                        <td align="center" style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:50px;">
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

/**
 * Kirim email Magic Link 2FA (Login atau Setup Aktivasi).
 */
exports.send2FAMagicLinkEmail = async (email, rawToken, type = 'LOGIN', reqOrigin = null) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  let frontendUrl = process.env.FRONTEND_URL;
  if ((!frontendUrl || frontendUrl.includes('localhost')) && reqOrigin) {
    try {
      frontendUrl = new URL(reqOrigin).origin;
    } catch (e) {}
  }
  frontendUrl = frontendUrl || 'http://localhost:5173';

  const magicLink = `${frontendUrl}/?mode=2fa&token=${encodeURIComponent(rawToken)}`;
  const transporter = getTransporter();

  const isSetup = type === 'SETUP';
  const isDisable = type === 'DISABLE';

  let title = 'Verifikasi Login 2FA MyFinance';
  let heading = 'Magic Link Verifikasi 2FA';
  let buttonText = 'Verifikasi Login Sekarang';
  let description = 'Klik tombol di bawah untuk masuk ke akun MyFinance kamu secara aman.';

  if (isSetup) {
    title = 'Aktivasi Autentikasi 2-Langkah (2FA)';
    heading = 'Konfirmasi Aktivasi 2FA';
    buttonText = 'Aktifkan 2FA Sekarang';
    description = 'Klik tombol di bawah ini untuk mengonfirmasi pengaktifan Autentikasi 2-Langkah pada akun MyFinance kamu.';
  } else if (isDisable) {
    title = 'Konfirmasi Penonaktifan 2FA MyFinance';
    heading = 'Konfirmasi Mematikan 2FA';
    buttonText = 'Nonaktifkan 2FA Sekarang';
    description = 'PERINGATAN: Klik tombol di bawah jika kamu benar-benar ingin menonaktifkan Autentikasi 2-Langkah pada akun MyFinance kamu.';
  }

  const mailOptions = {
    from: `"MyFinance Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: title,
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                      MyFinance Security
                    </h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                      ${heading}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">
                      ${heading}
                    </h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                      ${description}
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                      <tr>
                        <td align="center" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:50px;">
                          <a href="${magicLink}" 
                             style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                        Atau salin link ini ke browser:
                      </p>
                      <p style="margin:0;color:#7c3aed;font-size:12px;word-break:break-all;line-height:1.5;">
                        ${magicLink}
                      </p>
                    </div>
                    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                      Link ini hanya berlaku selama <strong>5 menit</strong> dan hanya dapat digunakan 1 kali.
                      Jika kamu tidak pernah melakukan permintaan ini, abaikan email ini.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © 2026 MyFinance · Keamanan Tingkat Tinggi
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
  console.log(`✅ 2FA Magic link email (${type}) sent to: ${email}`);
};

/**
 * Kirim Email Peringatan Keamanan saat 2FA Dinonaktifkan.
 */
exports.send2FADisabledSecurityEmail = async (email, ipAddress, userAgent, timestamp = new Date()) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  const transporter = getTransporter();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Asia/Jakarta'
  }).format(timestamp);

  const mailOptions = {
    from: `"MyFinance Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Peringatan Keamanan: 2FA Akun MyFinance Dinonaktifkan',
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Peringatan Keamanan 2FA</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:36px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                      Peringatan Keamanan
                    </h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">
                      Autentikasi 2-Langkah Dinonaktifkan
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#1e293b;font-size:18px;font-weight:700;">
                      Autentikasi 2FA Akun Anda Telah Dinonaktifkan
                    </h2>
                    <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6;">
                      Kami mendeteksi bahwa Autentikasi 2-Langkah (2FA) pada akun MyFinance Anda telah dinonaktifkan dengan rincian berikut:
                    </p>
                    
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#475569;font-size:13px;"><strong>Waktu:</strong> ${formattedDate}</p>
                      <p style="margin:0 0 8px;color:#475569;font-size:13px;"><strong>Alamat IP:</strong> ${ipAddress || 'Tidak terdeteksi'}</p>
                      <p style="margin:0;color:#475569;font-size:13px;"><strong>Perangkat:</strong> ${userAgent || 'Browser Web'}</p>
                    </div>

                    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px;border-radius:6px;margin-bottom:24px;">
                      <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.5;">
                        <strong>PENTING:</strong> Jika Anda tidak melakukan tindakan ini, akun Anda mungkin telah dikompromikan. Segera masuk dan ubah kata sandi akun Anda.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © 2026 MyFinance · Sistem Keamanan Akun
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
  console.log(`✅ 2FA deactivation security alert sent to: ${email}`);
};

/**
 * Kirim email OTP 2FA saat login dengan detail IP & User-Agent.
 */
exports.send2FAOtpEmail = async (email, otpCode) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  const transporter = getTransporter();

  const mailOptions = {
    from: `"MyFinance Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Kode OTP 2FA Login MyFinance: ${otpCode}`,
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kode OTP 2FA MyFinance</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:32px 36px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                      Kode OTP 2FA
                    </h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">
                      Verifikasi Keamanan Akses Masuk
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px;text-align:center;">
                    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
                      Gunakan 6-digit kode OTP berikut untuk menyelesaikan proses masuk ke akun MyFinance Anda:
                    </p>

                    <!-- Large OTP Box -->
                    <div style="background:#f0f9ff;border:2px dashed #0284c7;border-radius:12px;padding:16px 24px;margin:16px 0;display:inline-block;letter-spacing:10px;font-size:32px;font-weight:800;color:#0369a1;font-family:monospace;">
                      ${otpCode}
                    </div>

                    <p style="margin:16px 0 0;color:#ef4444;font-size:13px;font-weight:600;">
                      Kode berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © 2026 MyFinance · Autentikasi 2-Langkah
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ 2FA OTP email sent to: ${email}`);
};

/**
 * Kirim email OTP 6-digit untuk konfirmasi Hapus Akun.
 */
exports.sendDeleteAccountOtpEmail = async (email, otpCode) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env');
  }

  const transporter = getTransporter();

  const mailOptions = {
    from: `"MyFinance Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Kode OTP Hapus Akun MyFinance: ${otpCode}`,
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kode OTP Hapus Akun MyFinance</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px 36px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                      Peringatan Hapus Akun
                    </h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">
                      Konfirmasi Penghapusan Data Permanen
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px;text-align:center;">
                    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">
                      Gunakan 6-digit kode OTP berikut untuk mengonfirmasi penghapusan akun MyFinance Anda:
                    </p>

                    <!-- Large OTP Box -->
                    <div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:16px 24px;margin:16px 0;display:inline-block;letter-spacing:10px;font-size:32px;font-weight:800;color:#dc2626;font-family:monospace;">
                      ${otpCode}
                    </div>

                    <p style="margin:16px 0 0;color:#ef4444;font-size:13px;font-weight:600;">
                      Kode ini berlaku selama 5 menit. Jika Anda tidak pernah meminta penghapusan akun, segera ubah kata sandi Anda.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © 2026 MyFinance · Sistem Keamanan Akun
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Delete Account OTP email sent to: ${email}`);
};



