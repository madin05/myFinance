Role & Task:
You are a Senior Backend Security Engineer. Please implement a strict, production-grade 2FA (Two-Factor Authentication) workflow using Magic Link via Email for my web application.

Core Objective:
Build a hardened 2FA backend implementation that enforces strict security practices to prevent token interception, replay attacks, session hijacking, and brute-force attempts.

1. Database Schema Specifications
Create a dedicated two_factor_tokens table/model with the following fields and constraints:

id: Primary Key (UUID v4 or auto-increment ID)

user_id: Foreign Key referencing the user table (On Delete Cascade)

token_hash: String (Store ONLY the SHA-256 hash of the generated raw token, never store raw tokens)

device_ip: String (Store IPv4/IPv6 of the initial login request)

user_agent: Text (Store the client's browser/device HTTP User-Agent string)

expires_at: Timestamp (Must be strictly set to 5–10 minutes from creation)

is_used: Boolean (Default: false)

created_at: Timestamp (Default: Current Timestamp)

2. Authentication Workflow Logic
Step A: Login & Token Generation Endpoint
Verify user credentials (Email & Password).

If valid, DO NOT issue a full-access JWT/Session token yet.

Generate a secure random 32-byte hex string (Raw Token).

Hash the raw token using SHA-256.

Store the token_hash, user_id, device_ip, and user_agent in the two_factor_tokens table.

Issue a temporary, low-privilege pre_auth_token (Short TTL: 5 mins) containing { user_id, status: "AWAITING_2FA" }.

Send an email containing the Magic Link containing the Raw Token as a query parameter (e.g., [https://myapp.com/verify-2fa?token=](https://myapp.com/verify-2fa?token=)<RAW_TOKEN>).

Step B: Strict Token Verification Endpoint (GET /api/v1/auth/verify-2fa)
When the user clicks the link, perform the following validation pipeline strictly in order:

Extract the token from the query parameter and hash it using SHA-256.

Look up the record in two_factor_tokens matching the token_hash.

Strict Validation Checks (Reject with 401/403 if any check fails):

Check if the token record exists.

Check if is_used is true (Prevent Replay Attacks).

Check if current time > expires_at (Prevent Expired Token Usage).

Context Binding Check: Compare current request's IP Address and User-Agent against stored device_ip and user_agent. (Reject if there's a critical mismatch to prevent link interception across devices/networks).

Post-Validation Execution:

Update the record set is_used = true.

Invalidate/Delete all other pending 2FA tokens associated with this user_id.

Generate and return the Full-Access JWT / Session Cookie (HttpOnly, Secure, SameSite=Strict).

3. Hardening & Security Requirements
Rate Limiting: Implement a strict rate-limiter on the 2FA generation endpoint (Max 3 requests / 10 mins per IP/User) and verification endpoint (Max 5 attempts / 15 mins).

Single-Use Enforcer: Ensure atomic database operations so a token can never be processed twice concurrently.

Clean Architecture: Keep route handlers, validation services, and database layers clean and properly typed.

Please write clean, secure, and production-ready code for this setup based on my current tech stack. Ask me if you need my specific framework or ORM details before generating the code


flow after user active 2fa

[1. User Input Email & Password]
             │
             ▼
[2. Backend Verifikasi Password]
     ├── ❌ SALAH ──► Return Error
     └── 🟢 BENAR ──► Cek Status 2FA User
                       │
                       ▼
         [3. Backend Generate Token Unik]
         (Simpan ke DB + Set Expired 5 Menit)
                       │
                       ▼
         [4. Kirim Email Magic Link ke User]
         (Contoh: app.com/verify-2fa?token=XYZ)
                       │
                       ▼
         [5. Frontend Redirect ke Screen "Cek Email"]
                       │
                       ▼
   ┌─────────────────────────────────────────┐
   │  User Buka Inbox Email & Klik Link 2FA  │
   └─────────────────────────────────────────┘
                       │
                       ▼
         [6. Browser Buka Tab Baru / Redirect]
         (Hit Endpoint Verifikasi Backend)
                       │
                       ▼
         [7. Backend Validasi Token]
           ├── Token Kadaluarsa / is_used = true ──► Reject (Return Error)
           └── 🟢 Token Valid ──► 1. Set is_used = true
                                  2. Generate Session/JWT Full-Access
                                  3. Redirect User ke Dashboard


Lifecycle 2FA Lengkap
Fase 1: Registrasi Akun Pertama Kali

User daftar -> Kena Verifikasi Email Registrasi (cuma 1x seumur hidup akun) -> Akun aktif.

Pas akun baru aktif, 2FA statusnya masih DISABLED (Non-aktif) secara default.

Fase 2: Aktivasi / Setup 2FA (Di Halaman Settings)

User masuk ke Settings/Security di dashboard -> Klik tombol "Aktifkan 2FA via Email".

Backend bakal ngirim Magic Link Verifikasi Aktivasi ke email user.

User buka email, klik link tersebut -> Backend ubah status di database user: is_2fa_enabled = true.

Aktivasi selesai.

Fase 3: Process Login Harian (Alur Ketat yang Tadi)

Karena status is_2fa_enabled = true, tiap kali user login pake email + password, sistem gak langsung ngasih akses dashboard, tapi masuk ke alur ketat yang tadi (Kirim Magic Link 2FA -> Cek IP/User-Agent -> Validasi Hash -> Kasih Full Access JWT).