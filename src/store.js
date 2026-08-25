// src/store.js
import { userService } from "./services/userService.js";
import { transactionService } from "./services/transactionService.js";
import { savingsService } from "./services/savingsService.js";
import { accountService } from "./services/accountService.js";
import { budgetService } from "./services/budgetService.js";

import {
  getInitialStorage,
  _mapSavingData,
  _mapAccountData,
  formatCurrency,
  formatRupiah,
  formatDate,
} from "./store/storage.js";

import { userStoreMethods } from "./store/userStore.js";
import { transactionStoreMethods } from "./store/transactionStore.js";
import { budgetStoreMethods } from "./store/budgetStore.js";
import { savingStoreMethods } from "./store/savingStore.js";
import { accountStoreMethods } from "./store/accountStore.js";
import { notificationStoreMethods } from "./store/notificationStore.js";

export const store = {
  user: getInitialStorage("user", null),
  transactions: getInitialStorage("transactions", []),
  savings: getInitialStorage("savings", []),
  budgets: getInitialStorage("budgets", []),
  saldos: getInitialStorage("saldos", []),
  notifications: getInitialStorage("notifications", []),
  isSyncing: false,

  // Domain Modular Store Methods
  ...userStoreMethods,
  ...transactionStoreMethods,
  ...budgetStoreMethods,
  ...savingStoreMethods,
  ...accountStoreMethods,
  ...notificationStoreMethods,

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
        const currentAvatar = this.user.avatar;
        this.user = {
          ...this.user,
          ...dbUser,
          name: dbUser.name || this.user.name,
          avatar: currentAvatar || dbUser.avatar || this.user.avatar,
        };
      }

      if (Array.isArray(dbTxs)) {
        if (dbTxs.length > 0) {
          this.transactions = dbTxs.map((tx) => this._mapTransaction(tx));
        } else if (this.transactions.length > 0) {
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

  save() {
    localStorage.setItem("user", JSON.stringify(this.user));
    localStorage.setItem("transactions", JSON.stringify(this.transactions));
    localStorage.setItem("savings", JSON.stringify(this.savings));
    localStorage.setItem("budgets", JSON.stringify(this.budgets));
    localStorage.setItem("saldos", JSON.stringify(this.saldos));
    localStorage.setItem("notifications", JSON.stringify(this.notifications));
    this.updateUI();
    this.syncHeaderBadge();

    // Cross-Tab Realtime Synchronization via BroadcastChannel & Storage Event
    const storeChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('myfinance_store_channel') : null;

    if (storeChannel) {
      storeChannel.onmessage = (event) => {
        if (event.data?.type === 'STORE_UPDATED') {
          try {
            const updatedUser = JSON.parse(localStorage.getItem('user'));
            if (updatedUser) {
              store.user = updatedUser;
              store.updateUI();
              window.dispatchEvent(new CustomEvent('store-updated'));
            }
          } catch (e) {}
        }
      };
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'user' && event.newValue) {
        try {
          store.user = JSON.parse(event.newValue);
          store.updateUI();
          window.dispatchEvent(new CustomEvent('store-updated'));
        } catch (e) {}
      }
    });

    window.dispatchEvent(new CustomEvent("store-updated"));
    if (storeChannel) {
      try {
        storeChannel.postMessage({ type: 'STORE_UPDATED' });
      } catch (e) {}
    }
  },
};

// Re-export utility functions for full backward compatibility
export { formatCurrency, formatRupiah, formatDate };
