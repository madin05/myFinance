/**
 * @module modal (barrel)
 * Re-exports all modal utilities and implementations.
 *
 * This barrel file ensures backward compatibility — any file importing from
 * '../components/modal.js' will resolve to this index.js automatically.
 */

// Core utilities
export { animateCloseModal, bindModalEvents, parseIDRInput, formatIDRInput } from './modalCore.js';

// Modal implementations
export { openAddTransactionModal } from './transactionModal.js';
export { openConfirmModal } from './confirmModal.js';
export { openAdjustBalanceModal } from './adjustBalanceModal.js';
export { openEditUsernameModal } from './usernameModal.js';
export { openDeleteAccountModal } from './deleteAccountModal.js';
export { openDetailTransactionModal } from './detailTransactionModal.js';
export { openConfirmPasswordModal } from './confirmPasswordModal.js';
export { openQuickActionSheet } from './quickActionSheet.js';
export { openEnable2FAModal } from './enable2FAModal.js';
