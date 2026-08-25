// src/store/userStore.js
import { userService } from "../services/userService.js";
import { generateAvatarUrl } from "./storage.js";

export const userStoreMethods = {
  async setUser(userData, extraData = {}) {
    this.isSyncing = true;
    this.user = userData;
    this.save();

    if (userData?.token) {
      userService.createSession(userData.token).catch((err) => {
        console.error("Gagal membuat session cookie:", err);
      });
    }

    this.sync(extraData);
  },

  async updateProfile(profileData) {
    if (!this.user?.token) return;
    const currentAvatar = this.user.avatar;
    const isExplicitAvatarDelete = 'avatar' in profileData && (profileData.avatar === null || profileData.avatar === '');

    this.user = { ...this.user, ...profileData };

    if (isExplicitAvatarDelete) {
      this.user.avatar = null;
    } else if (!profileData.avatar && currentAvatar) {
      this.user.avatar = currentAvatar;
    }
    this.save();

    try {
      const updated = await userService.updateProfile(this.user.token, profileData);
      if (updated) {
        this.user = { ...this.user, ...updated };
        if (isExplicitAvatarDelete) {
          this.user.avatar = null;
        } else {
          const preservedAvatar = profileData.avatar || currentAvatar || updated.avatar;
          if (preservedAvatar) {
            this.user.avatar = preservedAvatar;
          }
        }
      }
      this.save();
      return this.user;
    } catch (err) {
      console.error("Update Profile Error:", err);
      throw err;
    }
  },

  async update2FAStatus(enabled) {
    if (!this.user?.token) return false;
    try {
      const updated = await userService.update2FA(this.user.token, enabled);
      if (updated) {
        this.user = { ...this.user, ...updated };
        this.save();
        return true;
      }
      return false;
    } catch (err) {
      console.error("2FA Update Error:", err);
      return false;
    }
  },

  async changePassword(oldPassword, newPassword) {
    if (!this.user?.token) return;
    return userService.changePassword(this.user.token, oldPassword, newPassword);
  },

  async deleteAccountRemote() {
    if (!this.user?.token) return;
    try {
      await userService.deleteAccount(this.user.token);
      this.logout();
      return true;
    } catch (err) {
      console.error("Delete Account Error:", err);
      throw err;
    }
  },

  async logout() {
    this.user = null;
    this.transactions = [];
    this.savings = [];
    this.budgets = [];
    this.saldos = [];
    localStorage.removeItem("user");
    localStorage.removeItem("transactions");
    localStorage.removeItem("savings");
    localStorage.removeItem("budgets");
    localStorage.removeItem("saldos");

    try {
      await userService.deleteSession();
    } catch (err) {
      console.error("Gagal menghapus session cookie:", err);
    }
  },

  async getToken() {
    try {
      const { auth } = await import("../firebase-config.js");
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token && this.user) {
          this.user.token = token;
        }
        return token || this.user?.token || "";
      }
    } catch {
      // ignore
    }
    return this.user?.token || "";
  },

  updateUI() {
    if (!this.user) return;

    const avatarElements = document.querySelectorAll(
      ".user-avatar-img, #user-avatar, #profile-preview, #full-pp-preview"
    );
    const nameElements = document.querySelectorAll(
      ".user-name, #user-name-display, #nav-user-name"
    );
    const emailElements = document.querySelectorAll(
      ".user-email, #nav-user-email"
    );

    const avatarUrl = this.user.avatar || generateAvatarUrl(this.user.name);

    avatarElements.forEach((el) => {
      if (el.tagName === "IMG") {
        el.setAttribute("referrerpolicy", "no-referrer");

        el.onerror = () => {
          const fallbackUrl = generateAvatarUrl(this.user.name || "User");
          if (el.src !== fallbackUrl) el.src = fallbackUrl;
          const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
          if (wrapper) {
            wrapper.classList.remove("skeleton", "skeleton-circle");
            el.style.opacity = "1";
          }
        };

        if (el.getAttribute("data-src-loaded") !== avatarUrl) {
          el.src = avatarUrl;
          el.onload = () => {
            el.style.opacity = "1";
            el.setAttribute("data-src-loaded", avatarUrl);
            const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
            if (wrapper) wrapper.classList.remove("skeleton", "skeleton-circle");
          };
        } else {
          el.style.opacity = "1";
          const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
          if (wrapper) wrapper.classList.remove("skeleton", "skeleton-circle");
        }
      } else {
        el.style.opacity = "1";
        const wrapper = el.closest(".avatar-wrapper") || el.parentElement;
        if (wrapper) wrapper.classList.remove("skeleton", "skeleton-circle");
      }
    });

    nameElements.forEach((el) => {
      el.textContent = this.user.name;
      el.classList.remove("skeleton", "skeleton-text");
    });

    emailElements.forEach((el) => {
      el.textContent = this.user.email;
      el.classList.remove("skeleton", "skeleton-text");
    });
  },
};
