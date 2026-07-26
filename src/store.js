// src/store.js
import { userService } from "./services/userService.js";
import { transactionService } from "./services/transactionService.js";
import { savingsService } from "./services/savingsService.js";
import { accountService } from "./services/accountService.js";
import { budgetService } from "./services/budgetService.js";

// --- Helper Utilities ---

function getInitialStorage(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`[Store] Gagal membaca localStorage key "${key}":`, e);
    return fallback;
  }
}

function generateAvatarUrl(name = "User") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=7C3AED&color=fff&bold=true`;
}

function _mapSavingData(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    target: s.targetAmount !== undefined ? s.targetAmount : s.target || 0,
    current: s.currentAmount !== undefined ? s.currentAmount : s.current || 0,
    icon: s.icon,
    color: s.color,
    orderIndex: s.orderIndex,
    isDone: Boolean(s.isDone),
  };
}

function _mapAccountData(a) {
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance || 0),
    logo: a.logo || "",
    orderIndex: a.orderIndex,
  };
}

// --- Main Store ---

export const store = {
  user: getInitialStorage("user", null),
  transactions: getInitialStorage("transactions", []),
  savings: getInitialStorage("savings", []),
  budgets: getInitialStorage("budgets", []),
  saldos: getInitialStorage("saldos", []),
  notifications: getInitialStorage("notifications", []),
  isSyncing: false,

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

  async sync(extraData = {}) {
    if (!this.user?.token) return;
    this.isSyncing = true;

    try {
      // Fetch user profile and all domain data in parallel (concurrent requests)
      const [dbUser, dbTxs, dbBudgets, dbSavings, dbAccounts] = await Promise.all([
        userService.syncUser(this.user.token, extraData),
        transactionService.fetchTransactions(this.user.token),
        budgetService.fetchBudgets(this.user.token),
        savingsService.fetchSavings(this.user.token),
        accountService.fetchAccounts(this.user.token),
      ]);

      if (dbUser) {
        this.user = {
          ...this.user,
          ...dbUser,
          name: dbUser.name || this.user.name,
          avatar: dbUser.avatar || this.user.avatar,
        };
      }

      // 3. Hanya perbarui data jika response valid (bukan null akibat HTTP / network error)
      if (Array.isArray(dbTxs)) {
        if (dbTxs.length > 0) {
          this.transactions = dbTxs.map((tx) => this._mapTransaction(tx));
        } else if (this.transactions.length > 0) {
          // Sync transaksi lokal ke DB jika DB masih kosong
          this.syncTransactionsToDB();
        } else {
          this.transactions = [];
        }
      }

      if (Array.isArray(dbBudgets)) {
        this.budgets = dbBudgets;
      }

      if (Array.isArray(dbSavings)) {
        if (dbSavings.length > 0) {
          this.savings = dbSavings.map(_mapSavingData);
        } else if (this.savings.length > 0) {
          this.syncSavingsToDB();
        } else {
          this.savings = [];
        }
      }

      if (Array.isArray(dbAccounts)) {
        if (dbAccounts.length > 0) {
          this.saldos = dbAccounts.map(_mapAccountData);
        } else if (this.saldos.length > 0) {
          this.syncSaldosToDB();
        }
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      this.isSyncing = false;
      this.save();
      this.checkBudgetNotifications();
    }
  },

  async syncTransactionsToDB() {
    if (!this.user?.token || this.transactions.length === 0) return;
    try {
      for (const tx of this.transactions) {
        // Sync transaksi yang belum ada di DB (misal temp ID lokal)
        if (typeof tx.id === 'number' && tx.id > 1000000000000) {
          await transactionService.createTransaction(this.user.token, tx);
        }
      }
    } catch (err) {
      console.error("Sync Transaksi ke DB Error:", err);
    }
  },

  async syncSavingsToDB() {
    if (!this.user?.token || this.savings.length === 0) return;
    try {
      for (const s of this.savings) {
        await savingsService.createSaving(this.user.token, s);
      }
      const dbSavings = await savingsService.fetchSavings(this.user.token);
      if (Array.isArray(dbSavings)) {
        this.savings = dbSavings.map(_mapSavingData);
        this.save();
      }
    } catch (err) {
      console.error("Sync Savings ke DB Error:", err);
    }
  },

  async syncSaldosToDB() {
    if (!this.user?.token || this.saldos.length === 0) return;
    try {
      await accountService.syncAccounts(this.user.token, this.saldos);
    } catch (err) {
      console.error("Sync Saldo ke DB Error:", err);
    }
  },

  async fetchBudgets(period) {
    if (!this.user?.token) return;
    try {
      const data = await budgetService.fetchBudgets(this.user.token, period);
      if (data) {
        this.budgets = data;
        this.save();
        return this.budgets;
      }
    } catch (err) {
      console.error("Fetch Budgets Error:", err);
    }
  },

  async updateBudget(category, amount, period) {
    if (!this.user?.token) return;
    try {
      const newBudget = await budgetService.updateBudget(this.user.token, category, amount, period);
      if (newBudget) {
        const index = this.budgets.findIndex((b) => b.category === category);
        if (index > -1) this.budgets[index] = newBudget;
        else this.budgets.push(newBudget);
        this.save();
        this.checkBudgetNotifications();
      }
    } catch (err) {
      console.error("Update Budget Error:", err);
    }
  },

  async deleteBudget(id) {
    if (!this.user?.token) return false;
    try {
      const ok = await budgetService.deleteBudget(this.user.token, id);
      if (ok) {
        this.budgets = this.budgets.filter((b) => b.id !== id);
        this.save();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Delete Budget Error:", err);
      return false;
    }
  },

  save() {
    localStorage.setItem("user", JSON.stringify(this.user));
    localStorage.setItem("transactions", JSON.stringify(this.transactions));
    localStorage.setItem("savings", JSON.stringify(this.savings));
    localStorage.setItem("budgets", JSON.stringify(this.budgets));
    localStorage.setItem("saldos", JSON.stringify(this.saldos));
    localStorage.setItem("notifications", JSON.stringify(this.notifications));
    this.updateUI();
    this.syncHeaderBadge();

    window.dispatchEvent(new CustomEvent("store-updated"));
  },

  updateUI() {
    if (!this.user) return;

    const avatarElements = document.querySelectorAll(
      ".user-avatar-img, #user-avatar, #profile-preview, #full-pp-preview"
    );
    const nameElements = document.querySelectorAll(
      ".user-name, #user-name-display, #nav-user-name"
    );
    const emailElements = document.querySelectorAll(
      ".user-email, #nav-user-email"
    );

    const avatarUrl = this.user.avatar || generateAvatarUrl(this.user.name);

    avatarElements.forEach((el) => {
      if (el.tagName === "IMG") {
        el.setAttribute("referrerpolicy", "no-referrer");

        el.onerror = () => {
          const fallbackUrl = generateAvatarUrl(this.user.name || "User");
          if (el.src !== fallbackUrl) el.src = fallbackUrl;
          const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
          if (wrapper) {
            wrapper.classList.remove("skeleton", "skeleton-circle");
            el.style.opacity = "1";
          }
        };

        if (el.getAttribute("data-src-loaded") !== avatarUrl) {
          el.src = avatarUrl;
          el.onload = () => {
            el.style.opacity = "1";
            el.setAttribute("data-src-loaded", avatarUrl);
            const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
            if (wrapper) wrapper.classList.remove("skeleton", "skeleton-circle");
          };
        } else {
          el.style.opacity = "1";
          const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
          if (wrapper) wrapper.classList.remove("skeleton", "skeleton-circle");
        }
      } else {
        el.style.opacity = "1";
        const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
        if (wrapper) wrapper.classList.remove("skeleton", "skeleton-circle");
      }
    });

    nameElements.forEach((el) => {
      el.textContent = this.user.name;
      el.classList.remove("skeleton", "skeleton-text");
    });

    emailElements.forEach((el) => {
      el.textContent = this.user.email;
      el.classList.remove("skeleton", "skeleton-text");
    });
  },

  addNotification(source, title, desc, route = null) {
    const todayStr = new Date().toDateString();
    const exists = this.notifications.find(
      (n) =>
        n.title === title &&
        n.desc === desc &&
        new Date(n.time).toDateString() === todayStr
    );
    if (exists) return;

    const newNotif = {
      id: Date.now(),
      source,
      title,
      desc,
      route,
      time: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(newNotif);
    this.save();
  },

  syncHeaderBadge() {
    const badge = document.querySelector("#notif-trigger .header-badge");
    if (!badge) return;
    const unreadCount = this.notifications.filter((n) => !n.read).length;
    if (unreadCount === 0) {
      badge.style.display = "none";
    } else {
      badge.style.display = "flex";
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    }
  },

  checkBudgetNotifications() {
    if (this.transactions.length === 0 || this.budgets.length === 0) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const spending = {};
    this.transactions.forEach((t) => {
      const d = new Date(t.tanggal);
      if (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        t.type === "expense"
      ) {
        spending[t.kategori] =
          (spending[t.kategori] || 0) +
          Math.abs(Number(t.harga || t.amount || 0));
      }
    });

    this.budgets.forEach((b) => {
      const spent = spending[b.category] || 0;
      if (b.amount > 0) {
        const pct = (spent / b.amount) * 100;
        if (pct >= 100) {
          this.addNotification(
            "Anggaran",
            "Anggaran Melebihi Batas",
            `Anggaran kategori "${b.category}" telah melebihi batas (Rp ${spent.toLocaleString("id-ID")}).`,
            "/anggaran"
          );
        } else if (pct >= 85) {
          this.addNotification(
            "Anggaran",
            "Anggaran Hampir Habis",
            `Pengeluaran "${b.category}" sudah mencapai ${Math.round(pct)}% dari target anggaran.`,
            "/anggaran"
          );
        }
      }
    });
  },

  async setUser(userData, extraData = {}) {
    this.isSyncing = true;
    this.user = userData;
    this.save();

    if (userData?.token) {
      userService.createSession(userData.token).catch((err) => {
        console.error("Gagal membuat session cookie:", err);
      });
    }

    this.sync(extraData);
  },

  async updateProfile(profileData) {
    if (!this.user?.token) return;
    this.user = { ...this.user, ...profileData };
    this.save();

    try {
      const updated = await userService.updateProfile(this.user.token, profileData);
      this.user = { ...this.user, ...updated };
      this.save();
      return this.user;
    } catch (err) {
      console.error("Update Profile Error:", err);
      throw err;
    }
  },

  async update2FAStatus(enabled) {
    if (!this.user?.token) return false;
    try {
      const updated = await userService.update2FA(this.user.token, enabled);
      if (updated) {
        this.user = { ...this.user, ...updated };
        this.save();
        return true;
      }
      return false;
    } catch (err) {
      console.error("2FA Update Error:", err);
      return false;
    }
  },

  async changePassword(oldPassword, newPassword) {
    if (!this.user?.token) return;
    return userService.changePassword(this.user.token, oldPassword, newPassword);
  },

  async deleteAccountRemote() {
    if (!this.user?.token) return;
    try {
      await userService.deleteAccount(this.user.token);
      this.logout();
      return true;
    } catch (err) {
      console.error("Delete Account Error:", err);
      throw err;
    }
  },

  async logout() {
    this.user = null;
    this.transactions = [];
    this.savings = [];
    this.budgets = [];
    this.saldos = [];
    localStorage.removeItem("user");
    localStorage.removeItem("transactions");
    localStorage.removeItem("savings");
    localStorage.removeItem("budgets");
    localStorage.removeItem("saldos");

    try {
      await userService.deleteSession();
    } catch (err) {
      console.error("Gagal menghapus session cookie:", err);
    }
  },

  _applyTransactionToSaldo(tx, reverse = false) {
    if (!this.saldos) this.saldos = [];
    
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

  async addSaldo(saldo) {
    saldo.id = Date.now();
    this.saldos.push(saldo);
    this.save();

    if (this.user?.token) {
      try {
        const saved = await accountService.createAccount(this.user.token, saldo);
        if (saved) {
          const idx = this.saldos.findIndex((s) => s.id === saldo.id);
          if (idx !== -1) this.saldos[idx].id = saved.id;
          this.save();
        }
      } catch (err) {
        console.error("Add Saldo DB Error:", err);
      }
    }
    return saldo;
  },

  async updateSaldo(id, data) {
    const s = this.saldos.find((x) => x.id === id);
    if (s) {
      if (data.balance !== undefined) s.balance = Number(data.balance);
      if (data.name !== undefined) s.name = data.name;
      if (data.type !== undefined) s.type = data.type;
      if (data.logo !== undefined) s.logo = data.logo;
      this.save();

      if (this.user?.token) {
        try {
          await accountService.updateAccount(this.user.token, id, data);
        } catch (err) {
          console.error("Update Saldo DB Error:", err);
        }
      }
    }
  },

  async deleteSaldo(id) {
    this.saldos = this.saldos.filter((s) => s.id !== id);
    this.save();

    if (this.user?.token) {
      try {
        await accountService.deleteAccount(this.user.token, id);
      } catch (err) {
        console.error("Delete Saldo DB Error:", err);
      }
    }
  },

  addSaving(goal) {
    goal.id = Date.now();
    this.savings.push(goal);
    this.save();
  },

  async createSaving(goal) {
    if (!this.user?.token) {
      this.addSaving(goal);
      return goal;
    }

    const saved = await savingsService.createSaving(this.user.token, goal);
    const mapped = _mapSavingData(saved);
    this.savings.push(mapped);
    this.save();
    return mapped;
  },

  async editSaving(id, data) {
    const goal = this.savings.find((s) => s.id === id);
    if (!goal) return;

    const prev = { ...goal };
    Object.assign(goal, data);
    this.save();

    if (!this.user?.token) return goal;

    try {
      await savingsService.updateSaving(this.user.token, id, {
        name: goal.name,
        targetAmount: goal.target,
        currentAmount: goal.current,
        icon: goal.icon,
        color: goal.color,
        isDone: goal.isDone,
      });
      return goal;
    } catch (e) {
      Object.assign(goal, prev);
      this.save();
      throw e;
    }
  },

  updateSaving(id, amount) {
    const goal = this.savings.find((s) => s.id === id);
    if (goal) {
      goal.current += Number(amount);
      this.save();
    }
  },

  async addSavingFunds(id, amount) {
    const goal = this.savings.find((s) => s.id === id);
    if (!goal) return;

    const next = goal.current + Number(amount);

    if (next >= goal.target && goal.current < goal.target) {
      this.addNotification(
        "Wishlist",
        "Target Tabungan Tercapai!",
        `Selamat! Target dana untuk "${goal.name}" sudah terkumpul sepenuhnya.`,
        "/wishlist"
      );
    }

    if (!this.user?.token) {
      goal.current = next;
      this.save();
      return goal;
    }

    const prev = goal.current;
    goal.current = next;
    this.save();

    try {
      const updated = await savingsService.updateSaving(this.user.token, id, { currentAmount: next });
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
    this.savings = this.savings.filter((s) => s.id !== id);
    this.save();
  },

  async removeSaving(id) {
    const prev = this.savings;
    this.savings = this.savings.filter((s) => s.id !== id);
    this.save();

    if (!this.user?.token) return;

    try {
      await savingsService.deleteSaving(this.user.token, id);
    } catch (e) {
      this.savings = prev;
      this.save();
      throw e;
    }
  },

  async getToken() {
    try {
      const { auth } = await import("./firebase-config.js");
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token && this.user) {
          this.user.token = token;
        }
        return token || this.user?.token || "";
      }
    } catch {
      // ignore
    }
    return this.user?.token || "";
  },

  reorderSavings(newOrder) {
    this.savings = newOrder;
    this.save();
  },

  async reorderSavingsRemote(newOrder) {
    const orderedIds = newOrder.map((s) => s.id);
    const prev = this.savings;
    this.savings = newOrder;
    this.save();

    const token = await this.getToken();

    try {
      const saved = await savingsService.reorderSavings(token, orderedIds);
      if (Array.isArray(saved)) {
        this.savings = saved.map(_mapSavingData);
        this.save();
      }
    } catch (e) {
      this.savings = prev;
      this.save();
      throw e;
    }
  },
};

// --- Formatter & Utility Exports ---

const formatterCache = new Map();

export function formatCurrency(number) {
  const currency = store.user?.currency || "IDR";
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  const cacheKey = `${locale}-${currency}`;

  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  return formatterCache.get(cacheKey).format(number || 0);
}

export function formatRupiah(number) {
  return formatCurrency(number);
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  const options = { day: "numeric", month: "short", year: "numeric" };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}
