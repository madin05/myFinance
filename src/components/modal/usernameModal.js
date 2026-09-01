/**
 * @module usernameModal
 * Simple modal for editing the user's display name.
 */
import { getContainer, bindModalEvents } from './modalCore.js';

export function openEditUsernameModal(currentName, onUpdate) {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="edit-name-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Ubah Username</h3>
        </div>
        <form id="form-edit-name">
          <div class="form-group">
            <label>Username Baru</label>
            <input type="text" class="form-control" id="new-username" value="${currentName}" placeholder="Masukkan username..." required autocomplete="off">
          </div>
          <div style="display: flex; gap: 1rem;">
            <button type="button" class="btn btn-outline" style="flex: 1; justify-content: center;" id="btn-cancel-edit-name">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Ghost fix: removed non-existent 'btn-close-edit-name' from closeBtnIds
  const closeModal = bindModalEvents(container, 'edit-name-overlay', ['btn-cancel-edit-name']);

  document.getElementById('form-edit-name').addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('new-username').value.trim();
    closeModal();
    if (newName && newName !== currentName && onUpdate) {
      onUpdate(newName);
    }
  });

  setTimeout(() => {
    const input = document.getElementById('new-username');
    input?.focus();
    input?.select();
  }, 50);
}
