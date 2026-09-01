// src/store/notificationStore.js

export const notificationStoreMethods = {
  addNotification(source, title, desc, route = null) {
    const todayStr = new Date().toDateString();
    const exists = this.notifications.find(
      (n) =>
        n.title === title &&
        n.desc === desc &&
        new Date(n.time).toDateString() === todayStr
    );
    if (exists) return;

    const newNotif = {
      id: Date.now(),
      source,
      title,
      desc,
      route,
      time: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(newNotif);
    this.save();
  },

  syncHeaderBadge() {
    const badge = document.querySelector("#notif-trigger .header-badge");
    if (!badge) return;
    const unreadCount = this.notifications.filter((n) => !n.read).length;
    if (unreadCount === 0) {
      badge.style.display = "none";
    } else {
      badge.style.display = "flex";
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    }
  },
};
