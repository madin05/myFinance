// src/store/budgetStore.js
import { budgetService } from "../services/budgetService.js";
import { getLocalPeriodKey } from "./storage.js";

export const budgetStoreMethods = {
  async fetchBudgets(period) {
    if (!this.user?.token) return null;
    try {
      const data = await budgetService.fetchBudgets(this.user.token, period);
      if (Array.isArray(data)) {
        if (period) {
          // Merge budgets for the requested period without wiping other months
          const others = (this.budgets || []).filter((b) => b.period && b.period !== period);
          this.budgets = [...others, ...data];
        } else {
          this.budgets = data;
        }
        this.save();
        return this.budgets;
      }
      return null;
    } catch (err) {
      console.error("Fetch Budgets Error:", err);
      return null;
    }
  },

  async updateBudget(category, amount, period) {
    if (!this.user?.token) return null;
    const targetPeriod = period || getLocalPeriodKey();
    try {
      const newBudget = await budgetService.updateBudget(this.user.token, category, amount, targetPeriod);
      if (newBudget) {
        if (!Array.isArray(this.budgets)) this.budgets = [];
        const budgetPeriod = newBudget.period || targetPeriod;
        const index = this.budgets.findIndex(
          (b) => b.category === newBudget.category && (!b.period || b.period === budgetPeriod)
        );
        if (index > -1) this.budgets[index] = newBudget;
        else this.budgets.push(newBudget);
        this.save();
        this.checkBudgetNotifications();
        return newBudget;
      }
      return null;
    } catch (err) {
      console.error("Update Budget Error:", err);
      return null;
    }
  },

  async deleteBudget(id) {
    if (!this.user?.token) return false;
    try {
      const ok = await budgetService.deleteBudget(this.user.token, id);
      if (ok) {
        this.budgets = (this.budgets || []).filter((b) => b.id !== id);
        this.save();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Delete Budget Error:", err);
      return false;
    }
  },

  checkBudgetNotifications() {
    if (!this.transactions?.length || !this.budgets?.length) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentPeriod = getLocalPeriodKey(now);

    const spending = {};
    this.transactions.forEach((t) => {
      const d = new Date(t.tanggal);
      if (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        t.type === "expense"
      ) {
        const catKey = (t.kategori || t.category || "").trim().toLowerCase();
        if (catKey) {
          spending[catKey] =
            (spending[catKey] || 0) +
            Math.abs(Number(t.harga || t.amount || 0));
        }
      }
    });

    this.budgets
      .filter((b) => !b.period || b.period === currentPeriod)
      .forEach((b) => {
        const catKey = (b.category || "").trim().toLowerCase();
        const spent = spending[catKey] || 0;
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
};
