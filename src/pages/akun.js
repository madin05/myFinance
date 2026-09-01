import { store, formatDate } from "../store.js";
import { userService } from "../services/userService.js";
import { showLoading, hideLoading } from "../utils.js";
import { navigateTo } from "../router.js";
import {
  showToast,
  showAlert,
  showConfirm,
  checkVerification,
} from "../components/notifications.js";
import {
  openEditUsernameModal,
  openDeleteAccountModal,
  openConfirmPasswordModal,
  openEnable2FAModal,
  openDisable2FAModal,
} from "../components/modal/index.js";
import { initCustomSelect } from "../components/customSelect.js";
import {
  auth,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
} from "../firebase-config.js";

export function renderAkun() {
  const container = document.getElementById("page-content");
  if (!container) return;
  const user = store.user;
  const firebaseUser = auth.currentUser;
  const isVerified = firebaseUser ? firebaseUser.emailVerified : (user?.emailVerified ?? false);

  const hasCustomAvatar = Boolean(
    user.avatar &&
    !user.avatar.includes('ui-avatars.com') &&
    !user.avatar.includes('api.dicebear.com')
  );

  // Format join date dari data riil
  const joinDate = user.createdAt
    ? formatDate(user.createdAt)
    : "12 Maret 2024";

  container.innerHTML = `
    <div class="account-settings">
      <div class="section-header">
        <div>
          <h3>Pengaturan Profil</h3>
        </div>
      </div>

      <div class="account-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(350px, 100%), 1fr)); gap: 1.5rem; margin-top: 1.5rem; align-items: start;">
        
        <!-- Section 1: Profile Preview & Identity -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="stat-card profile-card" style="padding: 2.5rem 1.5rem; text-align: center;">
            <div class="avatar-wrapper" style="position: relative; width: 120px; height: 120px; margin: 0 auto 1.5rem; cursor: pointer;" id="btn-preview-pp">
               <img src="${user.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name || "User") + "&background=7C3AED&color=fff&bold=true"}" id="profile-preview" referrerpolicy="no-referrer" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=7C3AED&color=fff&bold=true'; this.parentElement.classList.remove('skeleton');" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: var(--shadow-lg); border: 4px solid var(--white);">
              <label for="avatar-upload" class="edit-avatar-btn" style="position: absolute; bottom: 0; right: 0; background: var(--text-main); color: var(--card-bg); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid var(--card-bg);" onclick="event.stopPropagation()" title="Ubah Foto Profil">
                <i class="ph ph-camera"></i>
              </label>
              <input type="file" id="avatar-upload" style="display: none;" accept="image/*">
            </div>
            <h3 style="margin-bottom: 0.25rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
              @${user.name || "user"}
              <button class="icon-btn" id="btn-edit-username" style="width: 28px; height: 28px; font-size: 0.8rem; background: var(--bg-color); border-radius: 50%;" title="Ubah Username">
                <i class="ph ph-pencil-simple"></i>
              </button>
            </h3>
            <p class="text-muted text-sm" style="margin-bottom: 1.5rem;">${user.email}</p>
            
            <!-- Metadata Informasi Akun -->
            <div style="display: flex; flex-direction: column; gap: 0.75rem; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 1.25rem 0.5rem; margin-bottom: ${!isVerified ? '1.5rem' : '0'}; text-align: left;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-muted text-sm">Join Date</span>
                <span class="font-bold text-sm" style="color: var(--text-main);">${joinDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-muted text-sm">Status Akun</span>
                <span class="${isVerified ? 'text-green' : 'text-amber'} text-sm font-bold">${isVerified ? 'Aktif' : 'Belum Verifikasi'}</span>
              </div>
            </div>

            ${!isVerified ? `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 0.85rem; width: 100%;">
                <div class="account-badge" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); padding: 6px 16px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                  <i class="ph-bold ph-warning-circle" style="font-size: 0.9rem;"></i> BELUM VERIFIKASI
                </div>
                <button id="btn-resend-verification" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 8px 16px; border-radius: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; width: 100%; justify-content: center;">
                  <i class="ph ph-paper-plane-tilt"></i> Kirim Ulang Email Verifikasi
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Section 2: Security & Identity Form -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem; position: relative;">
          <div class="stat-card" style="padding: 2rem;">
            <h4 style="margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
              <i class="ph ph-shield-check" style="font-size: 1.4rem;"></i>
              Akses Keamanan
            </h4>
            
            <!-- Change Password Link -->
            <div style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
              <a href="#" id="btn-change-password" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 0.875rem; color: var(--text-main); padding: 0.5rem 0; text-decoration: none;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  Ganti Password
                </div>
                <i class="ph ph-arrow-square-out" style="font-size: 1.1rem; color: var(--text-muted);"></i>
              </a>
            </div>

            <!-- 2FA Toggle -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p class="font-bold text-sm" style="margin: 0;">Autentikasi 2 Faktor (2FA)</p>
                <p class="text-muted text-xs" style="font-size: 0.76rem !important; margin-top: 3px; margin-bottom: 0;">Tambah keamanan akunmu, yuk aktifin 2FA!</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="toggle-2fa" ${user.is2FAEnabled ? "checked" : ""}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="stat-card" style="padding: 2rem; border: 1.5px solid rgba(239, 68, 68, 0.15); background: rgba(239, 68, 68, 0.02);">
            <h4 style="margin-bottom: 0.35rem; font-size: 1rem; color: var(--red); display: flex; align-items: center; gap: 10px;">
              Hapus Akun
            </h4>
            <p class="text-muted text-xs" style="font-size: 0.76rem !important; margin-bottom: 1.25rem; line-height: 1.45;">Hati-hati, tindakan ini gak bisa dibatalkan. Seluruh data finansialmu bakal dihapus permanen.</p>
            <button class="btn" style="background: var(--red); color: white; width: 100%; border-radius: 12px; height: 48px; font-weight: 600; gap: 10px;" id="btn-delete-account">
              <i class="ph-bold ph-trash"></i>
              Hapus Akun & Data
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="pp-preview-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; align-items: center; justify-content: center; flex-direction: column; gap: 1.25rem;">
      <div style="position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);" id="pp-modal-close"></div>
      <img src="${user.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name || "User") + "&background=7C3AED&color=fff&bold=true"}" id="full-pp-preview" style="position: relative; width: min(360px, 80vw); height: min(360px, 80vw); border-radius: 50%; object-fit: cover; border: 4px solid var(--white); box-shadow: var(--shadow-xl);">
      ${hasCustomAvatar ? `
        <button id="btn-delete-avatar-modal" class="btn" style="position: relative; z-index: 2; background: #ef4444; color: white; border-radius: 100px; padding: 10px 24px; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; border: none; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); cursor: pointer;">
          <i class="ph-bold ph-trash"></i> Hapus Foto Profil
        </button>
      ` : ''}
    </div>
  `;

  // --- Initialize Custom UI Elements ---
  const currencySelect = document.getElementById("user-currency");
  if (currencySelect) {
    initCustomSelect(currencySelect);
  }

  // --- Handlers ---

  const btnPreviewPp = document.getElementById("btn-preview-pp");
  if (btnPreviewPp) {
    btnPreviewPp.onclick = () => {
      const modal = document.getElementById("pp-preview-modal");
      if (modal) modal.style.display = "flex";
    };
  }

  const ppModalClose = document.getElementById("pp-modal-close");
  if (ppModalClose) {
    ppModalClose.onclick = () => {
      const modal = document.getElementById("pp-preview-modal");
      if (modal) modal.style.display = "none";
    };
  }

  // Kirim Ulang Email Verifikasi Handler
  const btnResendVerif = document.getElementById("btn-resend-verification");
  if (btnResendVerif) {
    btnResendVerif.onclick = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showToast("Pengguna tidak ditemukan. Silakan login ulang.", "error");
        return;
      }
      showLoading();
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/#login?verified=true`,
          handleCodeInApp: true
        };
        await sendEmailVerification(currentUser, actionCodeSettings);
        hideLoading();
        showAlert("Email Verifikasi Terkirim", `Tautan verifikasi telah dikirim ke email Anda (${currentUser.email}). Silakan periksa inbox atau folder spam Anda.`, "success");
      } catch (err) {
        hideLoading();
        console.error("Gagal mengirim email verifikasi:", err);
        if (err.code === "auth/too-many-requests") {
          showToast("Permintaan terlalu sering. Harap tunggu beberapa saat.", "warning");
        } else {
          showToast("Gagal mengirim email verifikasi: " + err.message, "error");
        }
      }
    };
  }

  const btnSaveFin = document.getElementById("btn-save-financial-start");
  if (btnSaveFin) {
    btnSaveFin.onclick = async () => {
      const newDay = document.getElementById("financial-start-day").value;
      const newCurrency = document.getElementById("user-currency").value;

      showLoading();
      try {
        await store.updateProfile({
          financialStartDay: parseInt(newDay),
          currency: newCurrency,
        });
        showToast("Berhasil diperbaharui!", "success");

        // Refresh UI to update currency symbols
        renderAkun();
      } catch (err) {
        showAlert("Gagal", err.message, "error");
      } finally {
        hideLoading();
      }
    };
  }

  const btnEditUsername = document.getElementById("btn-edit-username");
  if (btnEditUsername) {
    btnEditUsername.onclick = () => {
      checkVerification(() => {
        openEditUsernameModal(user.name, async (newName) => {
          showLoading();
          try {
            await store.updateProfile({ name: newName });
            renderAkun(); // Re-render to reflect changes
            showToast("Nama pengguna berhasil diperbarui.", "success");
          } catch (err) {
            showAlert("Gagal", err.message, "error");
          } finally {
            hideLoading();
          }
        });
      });
    };
  }

  const btnDeleteAccount = document.getElementById("btn-delete-account");
  if (btnDeleteAccount) {
    btnDeleteAccount.onclick = () => {
      checkVerification(() => {
        const userFirebase = auth.currentUser;
        if (!userFirebase) {
          showAlert(
            "Sesi Habis",
            "Silakan login ulang untuk melanjutkan.",
            "error",
          );
          return;
        }

        const providerId = userFirebase.providerData[0]?.providerId || "password";

        openDeleteAccountModal(providerId, async (passwordOrNull) => {
          showLoading();
          try {
            // 1. Re-auth jika pakai password lokal
            if (providerId === "password" && passwordOrNull) {
              const credential = EmailAuthProvider.credential(
                userFirebase.email,
                passwordOrNull,
              );
              await reauthenticateWithCredential(userFirebase, credential);
            }

            // 2. Hapus data dari Postgres via backend
            await store.deleteAccountRemote();

            // 3. Hapus user dari Firebase Auth
            await userFirebase.delete();

            showToast("Akun telah dihapus secara permanen.", "success");

            setTimeout(() => {
              window.location.href = '/login';
            }, 300);
          } catch (err) {
            hideLoading();
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
              showAlert("Gagal Hapus Akun", "Password yang kamu masukkan salah! Coba ingat-ingat lagi.", "error");
            } else if (err.code === "auth/requires-recent-login") {
              showAlert(
                "Sesi Kedaluwarsa",
                "Silakan logout dan login kembali sebelum menghapus akun demi keamanan.",
                "warning",
              );
            } else {
              showAlert("Gagal Hapus Akun", err.message, "error");
            }
          }
        });
      });
    };
  }

  const toggle2FA = document.getElementById("toggle-2fa");
  if (toggle2FA) {
    toggle2FA.checked = Boolean(store.user?.is2FAEnabled);

    const sync2FAToggleState = () => {
      const el = document.getElementById("toggle-2fa");
      if (el && store.user) {
        el.checked = Boolean(store.user.is2FAEnabled);
      }
    };
    window.addEventListener("store-updated", sync2FAToggleState);

    toggle2FA.onchange = async (e) => {
      const isChecked = e.target.checked;
      checkVerification(async () => {
        const userFirebase = auth.currentUser;
        if (isChecked) {
          e.target.checked = false;
          openEnable2FAModal(
            () => {
              e.target.checked = true;
            },
            () => {
              e.target.checked = false;
            }
          );
        } else {
          e.target.checked = true;
          const providerId = userFirebase?.providerData[0]?.providerId || "password";
          if (providerId === "password") {
            openConfirmPasswordModal(
              async (password) => {
                showLoading();
                try {
                  if (userFirebase) {
                    const credential = EmailAuthProvider.credential(userFirebase.email, password);
                    await reauthenticateWithCredential(userFirebase, credential);
                  }
                  hideLoading();
                  openDisable2FAModal(
                    () => {
                      e.target.checked = false;
                    },
                    () => {
                      e.target.checked = true;
                    },
                    password
                  );
                } catch (err) {
                  hideLoading();
                  e.target.checked = true;
                  let msg = err.message || "Password salah atau gagal meminta penonaktifan 2FA.";
                  if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                    msg = "Password yang kamu masukkan salah! Silakan coba lagi.";
                  }
                  showAlert("Gagal Menonaktifkan 2FA", msg, "error");
                }
              },
              () => {
                e.target.checked = true;
              }
            );
          } else {
            openDisable2FAModal(
              () => {
                e.target.checked = false;
              },
              () => {
                e.target.checked = true;
              }
            );
          }
        }
      });
    };
  }

  // Avatar handling logic with compression & optimistic UI
  const avatarUpload = document.getElementById("avatar-upload");
  if (avatarUpload) {
    avatarUpload.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      checkVerification(async () => {
        // Validasi tipe file
        if (!file.type.startsWith("image/")) {
          return showAlert("Error", "Berkas harus berupa gambar.", "error");
        }

        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const img = new Image();
            img.onload = async () => {
              // Kompresi Gambar (Cepat)
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 600;
              const MAX_HEIGHT = 600;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);

              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

              // 1. OPTIMISTIC UI: Ganti gambar & tutup modal SEKARANG JUGA
              store.user.avatar = compressedBase64;
              store.updateUI();

              const modal = document.getElementById("pp-preview-modal");
              if (modal) modal.style.display = "none";

              // 2. BACKGROUND SYNC: Kirim ke server diem-diem
              try {
                await store.updateProfile({ avatar: compressedBase64 });
                showToast("Foto profil diperbaharui!", "success");
              } catch (err) {
                showToast("Gagal sinkron, tapi profil lokal aman.", "warning");
              }
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        } catch (err) {
          showAlert("Gagal", "Ada masalah pas baca file gambar.", "error");
        }
      });
    };
  }

  // Delete Profile Picture Handler
  const handleDeleteAvatar = () => {
    checkVerification(async () => {
      showLoading();
      try {
        const modal = document.getElementById("pp-preview-modal");
        if (modal) modal.style.display = "none";

        await store.updateProfile({ avatar: null });
        hideLoading();
        showToast("Foto profil telah dihapus. Kembali ke avatar bawaan.", "info");
        renderAkun();
      } catch (err) {
        hideLoading();
        showAlert("Gagal", "Gagal menghapus foto profil: " + err.message, "error");
      }
    });
  };

  const btnDeleteAvatar = document.getElementById("btn-delete-avatar");
  if (btnDeleteAvatar) btnDeleteAvatar.onclick = handleDeleteAvatar;

  const btnDeleteAvatarModal = document.getElementById("btn-delete-avatar-modal");
  if (btnDeleteAvatarModal) btnDeleteAvatarModal.onclick = handleDeleteAvatar;

  // Change Password Handler
  const btnChangePassword = document.getElementById("btn-change-password");
  if (btnChangePassword) {
    btnChangePassword.onclick = async (e) => {
      e.preventDefault();
      checkVerification(async () => {
        const isGoogle = user.provider && user.provider.includes("google");

        if (isGoogle) {
          // Open Google Accounts password page in new tab
          window.open(
            "https://myaccount.google.com/signinoptions/password",
            "_blank",
          );
        } else {
          // Trigger password reset email via Firebase Auth / Backend for email/password users
          const confirmed = await showConfirm(
            "Ubah Kata Sandi",
            "Tautan untuk menyetel ulang kata sandi akan dikirim ke email Anda (" +
              user.email +
              "). Lanjutkan?",
          );
          if (!confirmed) return;

          showLoading();
          try {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

            const res = await fetch(`${API_URL}/auth/reset-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal mengirim email reset password.');

            hideLoading();

            showToast(
              `Tautan reset password telah dikirim ke ${user.email}!`,
              "success",
            );

            // Identify email provider for quick access
            const emailDomain = user.email.split("@")[1] || "";
            let mailUrl = "https://mail.google.com/";
            if (emailDomain.includes("yahoo")) {
              mailUrl = "https://mail.yahoo.com/";
            } else if (
              emailDomain.includes("outlook") ||
              emailDomain.includes("hotmail") ||
              emailDomain.includes("live")
            ) {
              mailUrl = "https://outlook.live.com/";
            }

            // Open mail client in new tab
            window.open(mailUrl, "_blank");
          } catch (err) {
            hideLoading();
            showAlert("Gagal", err.message, "error");
          }
        }
      });
    };
  }
}

