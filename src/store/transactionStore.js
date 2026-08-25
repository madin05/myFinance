// src/store/transactionStore.js
import { transactionService } from "../services/transactionService.js";

export const transactionStoreMethods = {
  _mapTransaction(tx) {
    if (!tx) return null;
    return {
      ...tx,
      id: tx.id,
      tanggal: tx.date || tx.tanggal || new Date().toISOString(),
      harga: tx.amount !== undefined ? tx.amount : tx.harga || 0,
      keterangan:
        tx.description !== undefined ? tx.description : tx.keterangan || "",
      kategori: tx.category || tx.kategori || "Umum",
      metode: tx.method || tx.metode || "Cash",
      akun: tx.account || tx.akun || "",
      type: tx.type || "expense",
    };
  },

  _applyTransactionToSaldo(tx, reverse = false) {
    if (!this.saldos) this.saldos = [];

    // --- Transfer Antar Akun ---
    if (tx.type === 'transfer') {
      const fromName = (tx.dariAkun || tx.akun || '').toLowerCase();
      const toName = (tx.keAkun || '').toLowerCase();
      let amount = Math.abs(Number(tx.harga || tx.amount || 0));
      if (reverse) amount = -amount;

      const fromSaldo = this.saldos.find((s) => (s.name || '').toLowerCase() === fromName);
      const toSaldo = this.saldos.find((s) => (s.name || '').toLowerCase() === toName);

      if (fromSaldo) {
        fromSaldo.balance = Number(fromSaldo.balance) - amount;
      }
      if (toSaldo) {
        toSaldo.balance = Number(toSaldo.balance) + amount;
      }
      return;
    }
    
    let targetSaldo = null;
    let targetType = "Cash";
    if (tx.metode === "E-Wallet") targetType = "E-Wallet";
    else if (tx.metode === "Bank Transfer" || tx.metode === "Kartu Kredit") targetType = "Bank";
    
    if (tx.akun) {
      const searchAkun = tx.akun?.toLowerCase() || '';
      targetSaldo = this.saldos.find((s) => {
        const sName = s.name?.toLowerCase() || '';
        if (sName === searchAkun) return true;
        if ((searchAkun === 'bank blu' && sName === 'blubca') || 
            (searchAkun === 'blubca' && sName === 'bank blu')) {
          return true;
        }
        return false;
      });
      
      if (!targetSaldo && !reverse) {
        targetSaldo = {
          id: Date.now() + Math.random(),
          name: tx.akun,
          type: targetType,
          balance: 0,
          logo: ''
        };
        this.saldos.push(targetSaldo);
      }
    }
    
    if (!targetSaldo) {
      targetSaldo = this.saldos.find((s) => s.type === targetType);
    }
    
    if (!targetSaldo) targetSaldo = this.saldos[0]; 
    if (!targetSaldo) return;
    
    let amount = Number(tx.harga || tx.amount || 0);
    if (reverse) amount = -amount;

    targetSaldo.balance = Number(targetSaldo.balance) + amount;
  },

  async scanReceipt(base64, mimeType = 'image/jpeg') {
    if (!this.user?.token) {
      throw new Error('Kamu harus login dulu untuk pakai fitur scan struk.');
    }
    return transactionService.scanReceipt(this.user.token, base64, mimeType);
  },

  async addTransaction(tx) {
    const tempId = Date.now();
    const newTx = { ...tx, id: tempId };
    this.transactions.unshift(newTx);
    this._applyTransactionToSaldo(newTx);
    this.save();
    this.checkBudgetNotifications();

    if (this.user?.token) {
      try {
        const savedTx = await transactionService.createTransaction(this.user.token, tx);
        if (savedTx) {
          this.transactions = this.transactions.map((t) =>
            t.id === tempId ? this._mapTransaction(savedTx) : t
          );
          this.save();
          this.syncSaldosToDB();
        }
      } catch (err) {
        console.error("Post Error:", err);
      }
    }
  },

  deleteTransaction(id) {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) this._applyTransactionToSaldo(tx, true);
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.save();
  },

  async deleteTransactionRemote(id) {
    const prev = [...this.transactions];
    const tx = this.transactions.find((t) => t.id === id);
    const prevSaldos = JSON.parse(JSON.stringify(this.saldos));

    if (tx) this._applyTransactionToSaldo(tx, true);
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.save();

    if (!this.user?.token) return;

    try {
      await transactionService.deleteTransaction(this.user.token, id);
      this.syncSaldosToDB();
    } catch (e) {
      this.transactions = prev;
      this.saldos = prevSaldos;
      this.save();
      throw e;
    }
  },

  getTransactionById(id) {
    return this.transactions.find((t) => t.id === id);
  },

  async updateTransaction(id, data) {
    const prev = [...this.transactions];
    const prevSaldos = JSON.parse(JSON.stringify(this.saldos));
    const oldTx = this.transactions.find((t) => t.id === id);
    
    if (oldTx) {
      this._applyTransactionToSaldo(oldTx, true);
      const newTx = { ...oldTx, ...data };
      this._applyTransactionToSaldo(newTx);
    }

    this.transactions = this.transactions.map((t) =>
      t.id === id ? { ...t, ...data } : t
    );
    this.save();
    this.checkBudgetNotifications();

    if (!this.user?.token) return;

    try {
      const updatedTx = await transactionService.updateTransaction(this.user.token, id, data);
      this.transactions = this.transactions.map((t) =>
        t.id === id ? this._mapTransaction(updatedTx) : t
      );
      this.save();
      this.checkBudgetNotifications();
      this.syncSaldosToDB();
    } catch (e) {
      this.transactions = prev;
      this.saldos = prevSaldos;
      this.save();
      throw e;
    }
  },

  async syncTransactionsToDB() {
    if (!this.user?.token || this.transactions.length === 0) return;
    try {
      for (const tx of this.transactions) {
        if (typeof tx.id === 'number' && tx.id > 1000000000000) {
          await transactionService.createTransaction(this.user.token, tx);
        }
      }
    } catch (err) {
      console.error("Sync Transaksi ke DB Error:", err);
    }
  },

  getStats() {
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

    let currentIncome = 0;
    let currentExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    this.transactions.forEach((t) => {
      const amount = Number(t.amount || t.harga || 0);
      const txDate = new Date(t.tanggal);

      if (t.type === "income") totalIncome += amount;
      else totalExpense += Math.abs(amount);

      if (txDate >= fourWeeksAgo && txDate <= now) {
        if (t.type === "income") currentIncome += amount;
        else currentExpense += Math.abs(amount);
      } else if (txDate >= eightWeeksAgo && txDate < fourWeeksAgo) {
        if (t.type === "income") prevIncome += amount;
        else prevExpense += Math.abs(amount);
      }
    });

    const calcDiff = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const rawBalance = totalIncome - totalExpense;
    const offset = Number(this.user?.balanceOffset || 0);

    const accountBalance = (this.saldos || []).reduce(
      (sum, s) => sum + Number(s.balance || 0),
      0
    );
    const hasAccounts = (this.saldos || []).length > 0;

    return {
      income: currentIncome,
      expense: currentExpense,
      balance: hasAccounts ? accountBalance : rawBalance + offset,
      rawBalance,
      accountBalance,
      hasAccounts,
      incomeDiff: calcDiff(currentIncome, prevIncome),
      expenseDiff: calcDiff(currentExpense, prevExpense),
      totalIncome,
      totalExpense,
    };
  },
};
