import { store } from '../store.js';

export function renderLogin() {
  const container = document.getElementById('login-view');
  container.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-icon bg-blue-light text-blue">
          <i class="ph-fill ph-wallet"></i>
        </div>
        <h2>Selamat Datang</h2>
        <p>Login ke My Finance (admin/admin)</p>
        
        <form id="login-form">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="username" class="form-control" placeholder="Masukkan username..." required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" class="form-control" placeholder="Masukkan password..." required>
          </div>
          <button type="submit" class="btn btn-primary btn-full mt-md">Login Sekarang</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    if (store.login(user, pass)) {
      window.location.hash = '#dashboard';
    } else {
      alert('Login gagal! Gunakan admin / admin');
    }
  });
}
