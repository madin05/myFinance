import test from 'node:test';
import assert from 'node:assert/strict';

import { hasActiveScrollLock } from '../ui/scrollLock.js';

function createMockDocument(matchingSelectors = []) {
  const activeSet = new Set(matchingSelectors);
  return {
    querySelector(selectorString) {
      const selectors = selectorString.split(',').map((s) => s.trim());
      for (const selector of selectors) {
        if (activeSet.has(selector)) {
          return { selector };
        }
      }
      return null;
    }
  };
}

test('hasActiveScrollLock returns false when no blocking overlay is active', () => {
  const doc = createMockDocument([]);
  assert.equal(hasActiveScrollLock(doc, 390), false);
  assert.equal(hasActiveScrollLock(doc, 1280), false);
});

test('hasActiveScrollLock detects modals, notification dropdown, offline gate, filter sheet, and drawers', () => {
  assert.equal(hasActiveScrollLock(createMockDocument(['.modal-overlay.active:not(#calc-overlay)']), 1280), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['#notif-dropdown.active']), 390), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['#profile-dropdown.active']), 1280), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['.custom-alert-overlay.active']), 390), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['.pwa-offline-gate.active']), 390), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['.pwa-ios-modal-overlay.active']), 390), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['#filter-backdrop.active']), 390), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['.history-drawer.open']), 1280), true);
  assert.equal(hasActiveScrollLock(createMockDocument(['#ai-history-panel.mobile-active']), 390), true);
});

test('hasActiveScrollLock locks calculator on mobile only and leaves desktop floating widget non-blocking', () => {
  const calcDoc = createMockDocument(['#calc-overlay.active']);
  assert.equal(hasActiveScrollLock(calcDoc, 390), true);
  assert.equal(hasActiveScrollLock(calcDoc, 768), true);
  assert.equal(hasActiveScrollLock(calcDoc, 1024), false);
});
