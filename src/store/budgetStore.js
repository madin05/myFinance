// src/store/budgetStore.js
import { budgetService } from "../services/budgetService.js";

export const budgetStoreMethods = {
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
};
