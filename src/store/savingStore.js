// src/store/savingStore.js
import { savingsService } from "../services/savingsService.js";
import { _mapSavingData } from "./storage.js";

export const savingStoreMethods = {
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
};
