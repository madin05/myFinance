// src/__tests__/budgetSync.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getLocalPeriodKey } from '../store/storage.js';
import { budgetStoreMethods } from '../store/budgetStore.js';
import { budgetService } from '../services/budgetService.js';

describe('Budget Period & Sync Integrity', () => {
  it('getLocalPeriodKey uses local year/month without UTC shift', () => {
    // Construct local Dec 1 at 00:15 local time (in UTC+7 this is Nov 30 17:15 UTC)
    const d = new Date(2026, 11, 1, 0, 15, 0);
    assert.equal(getLocalPeriodKey(d), '2026-12');
  });

  it('fetchBudgets(period) merges requested period without erasing other months', async () => {
    const origFetch = budgetService.fetchBudgets;
    try {
      budgetService.fetchBudgets = async (_token, period) => {
        if (period === '2026-12') {
          return [{ id: 2, category: 'Belanja', amount: 500000, period: '2026-12' }];
        }
        return [];
      };

      const mockStore = {
        user: { token: 'fake-token' },
        budgets: [
          { id: 1, category: 'Makanan & Minuman', amount: 1000000, period: '2026-11' },
          { id: 99, category: 'Hiburan', amount: 200000, period: '2026-12' }
        ],
        save() {}
      };
      Object.assign(mockStore, budgetStoreMethods);

      await mockStore.fetchBudgets('2026-12');

      // Should preserve 2026-11 and replace 2026-12 cleanly
      assert.equal(mockStore.budgets.length, 2);
      assert.ok(mockStore.budgets.find((b) => b.period === '2026-11' && b.category === 'Makanan & Minuman'));
      assert.ok(mockStore.budgets.find((b) => b.period === '2026-12' && b.category === 'Belanja'));
      assert.equal(mockStore.budgets.find((b) => b.id === 99), undefined);
    } finally {
      budgetService.fetchBudgets = origFetch;
    }
  });

  it('updateBudget matches by both category and period so other months are not overwritten', async () => {
    const origUpdate = budgetService.updateBudget;
    try {
      budgetService.updateBudget = async (_token, category, amount, period) => ({
        id: 20,
        category,
        amount,
        period
      });

      const mockStore = {
        user: { token: 'fake-token' },
        transactions: [],
        budgets: [
          { id: 1, category: 'Makanan & Minuman', amount: 1000000, period: '2026-11' }
        ],
        save() {},
        checkBudgetNotifications() {}
      };
      Object.assign(mockStore, budgetStoreMethods);

      const saved = await mockStore.updateBudget('Makanan & Minuman', 1500000, '2026-12');
      assert.ok(saved);
      assert.equal(mockStore.budgets.length, 2);
      assert.equal(mockStore.budgets[0].period, '2026-11');
      assert.equal(mockStore.budgets[0].amount, 1000000);
      assert.equal(mockStore.budgets[1].period, '2026-12');
      assert.equal(mockStore.budgets[1].amount, 1500000);
    } finally {
      budgetService.updateBudget = origUpdate;
    }
  });

  it('updateBudget returns null when API returns null instead of silently faking success', async () => {
    const origUpdate = budgetService.updateBudget;
    try {
      budgetService.updateBudget = async () => null;

      const mockStore = {
        user: { token: 'fake-token' },
        transactions: [],
        budgets: [],
        save() {},
        checkBudgetNotifications() {}
      };
      Object.assign(mockStore, budgetStoreMethods);

      const res = await mockStore.updateBudget('Tagihan', 300000, '2026-11');
      assert.equal(res, null);
      assert.equal(mockStore.budgets.length, 0);
    } finally {
      budgetService.updateBudget = origUpdate;
    }
  });
});
