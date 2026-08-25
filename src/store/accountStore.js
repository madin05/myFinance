// src/store/accountStore.js
import { accountService } from "../services/accountService.js";

export const accountStoreMethods = {
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

  async syncSaldosToDB() {
    if (!this.user?.token || this.saldos.length === 0) return;
    try {
      await accountService.syncAccounts(this.user.token, this.saldos);
    } catch (err) {
      console.error("Sync Saldo ke DB Error:", err);
    }
  },
};
