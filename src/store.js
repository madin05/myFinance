// src/store.js
export const store = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  transactions: JSON.parse(localStorage.getItem('transactions')) || [
    { id: 1, tanggal: '2023-10-24', kategori: 'Hiburan', metode: 'Kartu Kredit', keterangan: 'Langganan Netflix', harga: -186000, type: 'expense' },
    { id: 2, tanggal: '2023-10-23', kategori: 'Gaji', metode: 'Transfer Bank', keterangan: 'Gaji Bulanan', harga: 8500000, type: 'income' },
    { id: 3, tanggal: '2023-10-22', kategori: 'Makanan', metode: 'E-Wallet', keterangan: 'Makan Siang Bakso', harga: -45000, type: 'expense' },
    { id: 4, tanggal: '2023-10-21', kategori: 'Belanja', metode: 'Cash', keterangan: 'Kebutuhan Dapur', harga: -320000, type: 'expense' },
  ],
  savings: JSON.parse(localStorage.getItem('savings')) || [
    { id: 1, name: 'Macbook M3 Pro', target: 35000000, current: 15000000, icon: 'ph-laptop', color: 'bg-primary' },
    { id: 2, name: 'Liburan ke Jepang', target: 25000000, current: 5000000, icon: 'ph-airplane-tilt', color: 'bg-green' },
    { id: 3, name: 'Dana Darurat', target: 50000000, current: 12500000, icon: 'ph-shield-check', color: 'bg-orange' }
  ],
  
  save() {
    localStorage.setItem('user', JSON.stringify(this.user));
    localStorage.setItem('transactions', JSON.stringify(this.transactions));
    localStorage.setItem('savings', JSON.stringify(this.savings));
  },

  login(username, password) {
    if (username === 'admin' && password === 'admin') {
      this.user = { name: 'Admin', role: 'admin' };
      this.save();
      return true;
    }
    return false;
  },

  logout() {
    this.user = null;
    this.save();
  },

  addTransaction(tx) {
    tx.id = Date.now();
    this.transactions.unshift(tx);
    this.save();
  },

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.save();
  },

  updateTransaction(id, updatedTx) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.transactions[index] = { ...this.transactions[index], ...updatedTx };
      this.save();
    }
  },

  getTransactionById(id) {
    return this.transactions.find(t => t.id === id);
  },

  getStats() {
    let income = 0;
    let expense = 0;
    this.transactions.forEach(t => {
      if (t.type === 'income') income += t.harga;
      else expense += Math.abs(t.harga);
    });
    return {
      income,
      expense,
      balance: income - expense
    };
  },

  addSaving(goal) {
    goal.id = Date.now();
    this.savings.push(goal);
    this.save();
  },

  updateSaving(id, amount) {
    const goal = this.savings.find(s => s.id === id);
    if (goal) {
      goal.current += Number(amount);
      this.save();
    }
  },

  deleteSaving(id) {
    this.savings = this.savings.filter(s => s.id !== id);
    this.save();
  },

  reorderSavings(newOrder) {
    this.savings = newOrder;
    this.save();
  }
};

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

export function formatDate(dateString) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}
