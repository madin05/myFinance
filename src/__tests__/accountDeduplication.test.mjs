// src/__tests__/accountDeduplication.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAccountName,
  isSameAccount,
  deduplicateAccounts
} from '../store/storage.js';

import { accountStoreMethods } from '../store/accountStore.js';
import { transactionStoreMethods } from '../store/transactionStore.js';

describe('Account Normalization & Deduplication', () => {
  it('normalizeAccountName correctly normalizes bank names and cash variations', () => {
    assert.equal(normalizeAccountName('Bank BCA'), 'bca');
    assert.equal(normalizeAccountName('BCA'), 'bca');
    assert.equal(normalizeAccountName('Bank Mandiri'), 'mandiri');
    assert.equal(normalizeAccountName('Mandiri'), 'mandiri');
    assert.equal(normalizeAccountName('Bank Blu'), 'blu');
    assert.equal(normalizeAccountName('BluBCA'), 'blu');
    assert.equal(normalizeAccountName('blu'), 'blu');
    assert.equal(normalizeAccountName('Cash'), 'cash');
    assert.equal(normalizeAccountName('Dompet'), 'cash');
    assert.equal(normalizeAccountName('Uang Tunai'), 'cash');
    assert.equal(normalizeAccountName('Dompet Tunai'), 'cash');
    assert.equal(normalizeAccountName('GoPay'), 'gopay');
    assert.equal(normalizeAccountName('OVO'), 'ovo');
  });

  it('isSameAccount returns true for account name variations', () => {
    assert.equal(isSameAccount('BCA', 'Bank BCA'), true);
    assert.equal(isSameAccount('Bank BCA', 'BCA'), true);
    assert.equal(isSameAccount('Mandiri', 'Bank Mandiri'), true);
    assert.equal(isSameAccount('Bank Blu', 'blubca'), true);
    assert.equal(isSameAccount('Cash', 'Dompet'), true);
    assert.equal(isSameAccount('Dompet Tunai', 'Cash'), true);
    assert.equal(isSameAccount('GoPay', 'gopay'), true);

    assert.equal(isSameAccount('BCA', 'BNI'), false);
    assert.equal(isSameAccount('GoPay', 'OVO'), false);
  });

  it('deduplicateAccounts merges duplicate accounts and prevents doubled saldo', () => {
    const rawAccounts = [
      { id: 10, name: 'BCA', type: 'Bank', balance: 5000000, logo: 'bca.png' },
      { id: 1731920000000, name: 'Bank BCA', type: 'Bank', balance: 5000000, logo: '' },
      { id: 12, name: 'GoPay', type: 'E-Wallet', balance: 250000, logo: 'gopay.svg' },
      { id: 1731920000001, name: 'gopay', type: 'E-Wallet', balance: 0, logo: '' },
    ];

    const deduplicated = deduplicateAccounts(rawAccounts);

    assert.equal(deduplicated.length, 2);
    // Total saldo should be 5,000,000 + 250,000 = 5,250,000, NOT 10,250,000
    const totalSaldo = deduplicated.reduce((sum, a) => sum + a.balance, 0);
    assert.equal(totalSaldo, 5250000);

    const bca = deduplicated.find(a => normalizeAccountName(a.name) === 'bca');
    assert.ok(bca);
    assert.equal(bca.id, 10); // preserved real DB id
    assert.equal(bca.balance, 5000000);
    assert.equal(bca.logo, 'bca.png');

    const gopay = deduplicated.find(a => normalizeAccountName(a.name) === 'gopay');
    assert.ok(gopay);
    assert.equal(gopay.id, 12);
    assert.equal(gopay.balance, 250000);
  });

  it('accountStoreMethods.addSaldo updates existing account instead of creating duplicate', async () => {
    const mockStore = {
      saldos: [
        { id: 1, name: 'BCA', type: 'Bank', balance: 2000000, logo: '' }
      ],
      user: null,
      save() {}
    };

    Object.assign(mockStore, accountStoreMethods);

    // Menambah akun baru dengan nama 'Bank BCA' (nama sama beda prefix)
    await mockStore.addSaldo({ name: 'Bank BCA', type: 'Bank', balance: 3500000, logo: '' });

    // Harus tetap 1 akun, bukan 2 akun yang menggandakan saldo
    assert.equal(mockStore.saldos.length, 1);
    assert.equal(mockStore.saldos[0].balance, 3500000);
  });

  it('transactionStoreMethods._applyTransactionToSaldo matches existing accounts and does not create duplicate', () => {
    const mockStore = {
      saldos: [
        { id: 1, name: 'BCA', type: 'Bank', balance: 1000000, logo: '' }
      ],
      save() {}
    };

    Object.assign(mockStore, transactionStoreMethods);

    // Transaksi dengan nama 'Bank BCA'
    mockStore._applyTransactionToSaldo({
      akun: 'Bank BCA',
      metode: 'Bank Transfer',
      harga: -200000,
      type: 'expense'
    });

    // Harus tidak membuat akun duplikat, dan saldo BCA berkurang 200.000 menjadi 800.000
    assert.equal(mockStore.saldos.length, 1);
    assert.equal(mockStore.saldos[0].name, 'BCA');
    assert.equal(mockStore.saldos[0].balance, 800000);
  });
});
