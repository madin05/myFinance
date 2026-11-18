// src/store/accountStore.js
import { accountService } from "../services/accountService.js";
import { isSameAccount, deduplicateAccounts } from "./storage.js";

export const accountStoreMethods = {
  async addSaldo(saldo) {
    if (!this.saldos) this.saldos = [];
    this.saldos = deduplicateAccounts(this.saldos);

    const existingIndex = this.saldos.findIndex((s) => isSameAccount(s.name, saldo.name));
    if (existingIndex !== -1) {
      // Akun sudah ada, update saldo akun yang ada untuk mencegah duplikasi
      this.saldos[existingIndex].balance = Number(saldo.balance || 0);
      if (saldo.type) this.saldos[existingIndex].type = saldo.type;
      if (saldo.logo) this.saldos[existingIndex].logo = saldo.logo;
      this.save();

      const existing = this.saldos[existingIndex];
      if (this.user?.token && existing.id) {
        try {
          await accountService.updateAccount(this.user.token, existing.id, {
            name: existing.name,
            type: existing.type,
            balance: existing.balance,
            logo: existing.logo
          });
        } catch (err) {
          console.error("Update Saldo DB Error:", err);
        }
      }
      return this.saldos[existingIndex];
    }

    saldo.id = Date.now();
    this.saldos.push(saldo);
    this.saldos = deduplicateAccounts(this.saldos);
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

  async syncSaldosToDB() {
    if (!this.user?.token || !this.saldos || this.saldos.length === 0) return;
    this.saldos = deduplicateAccounts(this.saldos);
    this.save();
    try {
      await accountService.syncAccounts(this.user.token, this.saldos);
    } catch (err) {
      console.error("Sync Saldo ke DB Error:", err);
    }
  },
};
