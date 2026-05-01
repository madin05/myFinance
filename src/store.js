// src/store.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const store = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  transactions: JSON.parse(localStorage.getItem('transactions')) || [],
  savings: JSON.parse(localStorage.getItem('savings')) || [],
  budgets: JSON.parse(localStorage.getItem('budgets')) || [],
  
  _mapTransaction(tx) {
    if (!tx) return null;
    return {
      ...tx,
      id: tx.id,
      tanggal: tx.date || tx.tanggal || new Date().toISOString(),
      harga: tx.amount !== undefined ? tx.amount : (tx.harga || 0),
      keterangan: tx.description !== undefined ? tx.description : (tx.keterangan || ''),
      kategori: tx.category || tx.kategori || 'Umum',
      metode: tx.method || tx.metode || 'Cash',
      type: tx.type || 'expense'
    };
  },

  async sync() {
    if (!this.user?.token) return;
    
    try {
      // 1. Sync User info (Upsert)
      const userRes = await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.user.token}` }
      });
      
      if (userRes.ok) {
        const dbUser = await userRes.json();
        this.user = { ...this.user, ...dbUser };
        // Save immediately so UI reflects DB user even if other fetches fail.
        this.save();
      }

      // 2. Fetch Transactions
      const txRes = await fetch(`${API_URL}/transactions`, {
        headers: { 'Authorization': `Bearer ${this.user.token}` }
      });
      if (txRes.ok) {
        const dbTxs = await txRes.json();
        this.transactions = dbTxs.map(tx => this._mapTransaction(tx));
      }

      // 3. Fetch Budgets
      const budgetRes = await fetch(`${API_URL}/budgets`, {
        headers: { 'Authorization': `Bearer ${this.user.token}` }
      });
      if (budgetRes.ok) {
        this.budgets = await budgetRes.json();
      }

      // 4. Fetch Savings (Wishlist)
      const savingRes = await fetch(`${API_URL}/savings`, {
        headers: { 'Authorization': `Bearer ${this.user.token}` }
      });
      if (savingRes.ok) {
        const dbSavings = await savingRes.json();
        this.savings = dbSavings.map(s => ({
          id: s.id,
          name: s.name,
          target: s.targetAmount,
          current: s.currentAmount,
          icon: s.icon,
          color: s.color,
          orderIndex: s.orderIndex
        }));
      }
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      // Always persist latest known state (user/tx/budgets) to avoid UI mismatch.
      this.save();
    }
  },

  async updateBudget(category, amount) {
    if (!this.user?.token) return;
    try {
      const res = await fetch(`${API_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.user.token}`
        },
        body: JSON.stringify({ category, amount })
      });
      if (res.ok) {
        const newBudget = await res.json();
        const index = this.budgets.findIndex(b => b.category === category);
        if (index > -1) this.budgets[index] = newBudget;
        else this.budgets.push(newBudget);
        this.save();
      }
    } catch (err) {
      console.error('Update Budget Error:', err);
    }
  },

  save() {
    localStorage.setItem('user', JSON.stringify(this.user));
    localStorage.setItem('transactions', JSON.stringify(this.transactions));
    localStorage.setItem('savings', JSON.stringify(this.savings));
    localStorage.setItem('budgets', JSON.stringify(this.budgets));
    this.updateUI();
    
    // Kirim sinyal ke seluruh aplikasi kalau data berubah
    window.dispatchEvent(new CustomEvent('store-updated'));
  },

  updateUI() {
    if (this.user) {
      const avatarElements = document.querySelectorAll('.user-avatar-img, #user-avatar, #profile-preview, #full-pp-preview');
      const nameElements = document.querySelectorAll('.user-name, #user-name-display, #nav-user-name');
      const emailElements = document.querySelectorAll('.user-email, #nav-user-email');
      
      const avatarUrl = this.user.avatar || 'https://ui-avatars.com/api/?name=' + this.user.name;
      
      avatarElements.forEach(el => {
        if (el.tagName === 'IMG') {
          // Hanya pasang src kalau beda (biar gak flicker)
          if (el.getAttribute('data-src-loaded') !== avatarUrl) {
            el.src = avatarUrl;
            el.onload = () => {
              el.style.opacity = '1';
              el.setAttribute('data-src-loaded', avatarUrl);
              const wrapper = el.closest('.avatar-wrapper') || el.parentElement;
              if (wrapper) wrapper.classList.remove('skeleton', 'skeleton-circle');
            };
          } else {
            // Kalau udah pernah loaded, pastiin tetep kelihatan
            el.style.opacity = '1';
            const wrapper = el.closest('.avatar-wrapper') || el.parentElement;
            if (wrapper) wrapper.classList.remove('skeleton', 'skeleton-circle');
          }
        }
      });
      
      nameElements.forEach(el => {
        el.textContent = this.user.name;
        el.classList.remove('skeleton', 'skeleton-text');
      });

      emailElements.forEach(el => {
        el.textContent = this.user.email;
        el.classList.remove('skeleton', 'skeleton-text');
      });
    }
  },

  setUser(userData) {
    this.user = userData;
    this.save();
    this.sync();
  },

  async updateProfile(profileData) {
    if (!this.user?.token) return;
    this.user = { ...this.user, ...profileData };
    this.save();

    try {
      const res = await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.user.token}` 
        },
        body: JSON.stringify(profileData)
      });
      if (!res.ok) {
        let detail = '';
        try {
          const data = await res.json();
          detail = data?.message || data?.error || JSON.stringify(data);
        } catch {
          try {
            detail = await res.text();
          } catch {
            detail = '';
          }
        }
        throw new Error(detail || `Gagal update profil (HTTP ${res.status})`);
      }

      const updated = await res.json();
      this.user = { ...this.user, ...updated };
      this.save();
      return this.user;
    } catch (err) {
      console.error('Update Profile Error:', err);
      // UX IMPROVEMENT: We no longer rollback to prevUser.
      // The change stays in localStorage, and we just inform the user that sync failed.
      throw err;
    }
  },

  async update2FAStatus(enabled) {
    if (!this.user?.token) return;
    try {
      const res = await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.user.token}` 
        },
        body: JSON.stringify({ is2FAEnabled: enabled })
      });
      if (res.ok) {
        const updated = await res.json();
        this.user = { ...this.user, ...updated };
        this.save();
        return true;
      }
      return false;
    } catch (err) {
      console.error('2FA Update Error:', err);
      return false;
    }
  },

  logout() {
    this.user = null;
    this.transactions = [];
    this.savings = [];
    this.budgets = [];
    // Don't clear UI preferences like theme / sidebar state.
    localStorage.removeItem('user');
    localStorage.removeItem('transactions');
    localStorage.removeItem('savings');
    localStorage.removeItem('budgets');
  },

  async addTransaction(tx) {
    const tempId = Date.now();
    const newTx = { ...tx, id: tempId };
    this.transactions.unshift(newTx);
    this.save();

    if (this.user?.token) {
      try {
        const res = await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.user.token}`
          },
          body: JSON.stringify(tx)
        });
        if (res.ok) {
          const savedTx = await res.json();
          this.transactions = this.transactions.map(t => t.id === tempId ? this._mapTransaction(savedTx) : t);
          this.save();
        }
      } catch (err) {
        console.error('Post Error:', err);
      }
    }
  },

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.save();
  },

  async deleteTransactionRemote(id) {
    const prev = this.transactions;
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.save();

    if (!this.user?.token) return;

    try {
      const res = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.user.token}` }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Gagal hapus transaksi (HTTP ${res.status})`);
      }
    } catch (e) {
      this.transactions = prev;
      this.save();
      throw e;
    }
  },

  getTransactionById(id) {
    return this.transactions.find(t => t.id === id);
  },

  async updateTransaction(id, data) {
    const prev = [...this.transactions];
    this.transactions = this.transactions.map(t => t.id === id ? { ...t, ...data } : t);
    this.save();

    if (!this.user?.token) return;

    try {
      const res = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.user.token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Gagal update transaksi (HTTP ${res.status})`);
      }
      const updatedTx = await res.json();
      this.transactions = this.transactions.map(t => t.id === id ? this._mapTransaction(updatedTx) : t);
      this.save();
    } catch (e) {
      this.transactions = prev;
      this.save();
      throw e;
    }
  },

  getStats() {
    let income = 0;
    let expense = 0;
    this.transactions.forEach(t => {
      const amount = Number(t.amount || t.harga || 0);
      if (t.type === 'income') income += amount;
      else expense += Math.abs(amount);
    });
    return {
      income,
      expense,
      balance: income - expense
    };
  },

  addSaving(goal) {
    // Backward compatible local-only goal (no token).
    goal.id = Date.now();
    this.savings.push(goal);
    this.save();
  },

  async createSaving(goal) {
    if (!this.user?.token) {
      this.addSaving(goal);
      return goal;
    }

    const res = await fetch(`${API_URL}/savings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.user.token}`
      },
      body: JSON.stringify({
        name: goal.name,
        targetAmount: goal.target,
        currentAmount: goal.current || 0,
        icon: goal.icon,
        color: goal.color
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Gagal simpan wishlist (HTTP ${res.status})`);
    }

    const saved = await res.json();
    const mapped = {
      id: saved.id,
      name: saved.name,
      target: saved.targetAmount,
      current: saved.currentAmount,
      icon: saved.icon,
      color: saved.color,
      orderIndex: saved.orderIndex
    };
    this.savings.push(mapped);
    this.save();
    return mapped;
  },

  updateSaving(id, amount) {
    const goal = this.savings.find(s => s.id === id);
    if (goal) {
      goal.current += Number(amount);
      this.save();
    }
  },

  async addSavingFunds(id, amount) {
    const goal = this.savings.find(s => s.id === id);
    if (!goal) return;

    const next = goal.current + Number(amount);

    if (!this.user?.token) {
      goal.current = next;
      this.save();
      return goal;
    }

    const prev = goal.current;
    goal.current = next;
    this.save();

    try {
      const res = await fetch(`${API_URL}/savings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.user.token}`
        },
        body: JSON.stringify({ currentAmount: next })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Gagal update tabungan (HTTP ${res.status})`);
      }
      const updated = await res.json();
      goal.current = updated.currentAmount;
      this.save();
      return goal;
    } catch (e) {
      goal.current = prev;
      this.save();
      throw e;
    }
  },

  deleteSaving(id) {
    this.savings = this.savings.filter(s => s.id !== id);
    this.save();
  },

  async removeSaving(id) {
    const prev = this.savings;
    this.savings = this.savings.filter(s => s.id !== id);
    this.save();

    if (!this.user?.token) return;

    try {
      const res = await fetch(`${API_URL}/savings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.user.token}` }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Gagal hapus wishlist (HTTP ${res.status})`);
      }
    } catch (e) {
      this.savings = prev;
      this.save();
      throw e;
    }
  },

  reorderSavings(newOrder) {
    this.savings = newOrder;
    this.save();
  }
  ,

  async reorderSavingsRemote(newOrder) {
    const orderedIds = newOrder.map(s => s.id);
    const prev = this.savings;
    this.savings = newOrder;
    this.save();

    if (!this.user?.token) return;

    try {
      const res = await fetch(`${API_URL}/savings/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.user.token}`
        },
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Gagal simpan urutan wishlist (HTTP ${res.status})`);
      }
      const saved = await res.json();
      this.savings = saved.map(s => ({
        id: s.id,
        name: s.name,
        target: s.targetAmount,
        current: s.currentAmount,
        icon: s.icon,
        color: s.color,
        orderIndex: s.orderIndex
      }));
      this.save();
    } catch (e) {
      this.savings = prev;
      this.save();
      throw e;
    }
  }
};

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number || 0);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}
