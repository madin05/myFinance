// src/__tests__/store.test.js
/**
 * Store Modular Architecture Unit Tests
 */

import { formatCurrency, formatRupiah, formatDate, getInitialStorage } from "../store/storage.js";
import { transactionStoreMethods } from "../store/transactionStore.js";
import { budgetStoreMethods } from "../store/budgetStore.js";

describe("Store Utilities & Domain Modules", () => {
  test("formatCurrency formats number correctly for IDR", () => {
    const formatted = formatCurrency(150000);
    expect(formatted).toContain("150.000");
  });

  test("formatRupiah acts as alias to formatCurrency", () => {
    expect(formatRupiah(50000)).toBe(formatCurrency(50000));
  });

  test("formatDate handles invalid or null date gracefully", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("")).toBe("-");
  });

  test("formatDate formats valid ISO string correctly", () => {
    const formatted = formatDate("2026-08-25T00:00:00.000Z");
    expect(formatted).toMatch(/2026/);
  });

  test("_mapTransaction maps raw backend data to standard local transaction schema", () => {
    const rawTx = {
      id: "tx_123",
      amount: 75000,
      description: "Makan Siang",
      category: "Makanan",
      method: "Cash",
      type: "expense"
    };

    const mapped = transactionStoreMethods._mapTransaction(rawTx);
    expect(mapped.id).toBe("tx_123");
    expect(mapped.harga).toBe(75000);
    expect(mapped.keterangan).toBe("Makan Siang");
    expect(mapped.kategori).toBe("Makanan");
    expect(mapped.metode).toBe("Cash");
  });
});
