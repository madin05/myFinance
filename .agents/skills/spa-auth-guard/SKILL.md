---
name: spa-auth-guard
description: Implementasi perlindungan rute, penjagaan riwayat navigasi (history trap), proteksi tombol back browser, dan manajemen batas waktu sesi (session timeout) pada aplikasi SPA React Router. Gunakan saat menangani masalah tombol back yang tembus ke login/landing saat user sudah login, atau saat mengamankan rute terproteksi vs rute tamu.
---

# 🛡️ SPA Authentication Route Guard & History Protection

Skill ini memberikan panduan komprehensif langkah demi langkah untuk mengamankan autentikasi SPA (*Single Page Application*) menggunakan React Router dan Zustand/Context API, mencegah kebocoran navigasi tombol back browser, mengunci riwayat sesi, dan mengelola timeout sesi otomatis.

---

## 1. Deskripsi & Trigger

### Kapan Skill Ini Digunakan:
- Ketika user yang **sudah login** menekan tombol **Back (`<`)** browser lalu tidak sengaja melihat kembali form login atau halaman publik.
- Ketika login berhasil tetapi navigasi tidak me-replace history (`history stack leak`).
- Ketika ingin menerapkan **Guest Route Guard** (rute `/login` dilarang diakses jika sudah login).
- Ketika ingin menerapkan **Protected Route Guard** (rute `/dashboard/*` wajib login).
- Ketika ingin membuat mekanisme **Auto-Logout Sesi** (misal jika user meninggalkan dashboard selama > 1 jam).

### Kalimat Pemicu User:
- *"Kalo user pencet tombol back di browser jangan sampai balik ke form login"*
- *"Cegah tombol back keluar dari dashboard saat masih login"*
- *"Buat route guard untuk dashboard dan login"*
- *"Sesi otomatis logout jika tidak aktif selama 1 jam"*

---

## 2. Instructions (Langkah-demi-Langkah)

1. **Audit Riwayat Navigasi Login**:
   - Periksa fungsi `navigate` saat login berhasil di form login.
   - Wajib gunakan `navigate('/dashboard', { replace: true })` agar URL `/login` digantikan dari *browser history stack*.

2. **Terapkan Guest Route Guard pada `/login`**:
   - Di rute `/login` ([`App.tsx`](file:///c:/Arif/projek%20coding/web_alumni/src/App.tsx)), pasang kondisi:
     ```tsx
     <Route
       path="/login"
       element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
     />
     ```
   - Di dalam komponen [`LoginPage.tsx`](file:///c:/Arif/projek%20coding/web_alumni/src/components/auth/LoginPage.tsx), tambahkan efek pencegah:
     ```tsx
     useEffect(() => {
       if (isAuthenticated) {
         navigate('/dashboard', { replace: true });
       }
     }, [isAuthenticated, navigate]);
     ```

3. **Kunci Riwayat Browser di Dashboard (History Trap / `popstate`)**:
   - Di dalam layout dashboard ([`DashboardLayout.tsx`](file:///c:/Arif/projek%20coding/web_alumni/src/components/dashboard/DashboardLayout.tsx)), pasang listener event `popstate`:
     ```tsx
     useEffect(() => {
       if (!isAuthenticated) return;

       // Push dummy history entry
       window.history.pushState(null, '', window.location.href);

       const handlePopState = () => {
         // Kunci posisi agar user tetap berada di dashboard
         window.history.pushState(null, '', window.location.href);
       };

       window.addEventListener('popstate', handlePopState);
       return () => {
         window.removeEventListener('popstate', handlePopState);
       };
     }, [isAuthenticated]);
     ```

4. **Keluar Hanya Melalui Logout Resmi**:
   - Pada tombol **Logout** di header atau sidebar, hapus sesi di store dan arahkan ke beranda dengan `replace: true`:
     ```tsx
     const handleLogout = () => {
       logout();
       navigate('/', { replace: true });
     };
     ```

5. **Pelacak Batas Waktu Sesi (Session Tracker)**:
   - Buat komponen [`SessionTracker.tsx`](file:///c:/Arif/projek%20coding/web_alumni/src/components/common/SessionTracker.tsx) yang memantau lokasi rute, interval waktu 30 detik, serta event `visibilitychange`/`focus`.
   - Jika `Date.now() - lastDashboardActivity > TIMEOUT_MS`, panggil `logout()`.

---

## 3. Rules & Constraints

1. **Wajib `replace: true`**: Semua redirect autentikasi (masuk dashboard atau keluar ke login/beranda) WAJIB menggunakan `{ replace: true }`.
2. **Zero Form Exposure**: User yang sudah login dilarang keras dapat melihat kembali form login.
3. **Pemberian Hak Keluar**: Satu-satunya cara keluar dari dashboard yang terkunci adalah dengan menekan tombol **Logout** resmi.

---

## 4. Failure Modes & Cara Menghindarinya

| Failure Mode | Penyebab | Solusi Pencegahan |
| :--- | :--- | :--- |
| **Back Button Loop** | Menggunakan `navigate(-1)` atau redirect tanpa `replace: true` | Selalu gunakan `<Navigate to="..." replace />` dan `navigate(..., { replace: true })`. |
| **Sesi Hilang Saat Refresh** | State auth hanya di memori | Gunakan `zustand/middleware` `persist` ke `localStorage`. |
| **Zombie Port di Dev Server** | Membuka server baru tanpa mematikan proses lama | Matikan proses Node lama di port 5173 sebelum menjalankan `npm run dev`. |
