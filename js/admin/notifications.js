document.addEventListener('DOMContentLoaded', async () => {
  const session = Session.require('admin');
  if (!session) return;
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault(); Session.clear(); window.location.href = '../../pages/auth/login.html';
  });
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });
  document.getElementById('userName').textContent = session.name;
  document.getElementById('userInitial').textContent = session.name.charAt(0).toUpperCase();
  
  updateBadge();
  loadNotifications();

  document.getElementById('markAllBtn').addEventListener('click', async () => {
    if(NotificationService && NotificationService.markAllAsRead) {
      await NotificationService.markAllAsRead(session.userId);
      loadNotifications();
      updateBadge();
    }
  });

  document.getElementById('notifFilter').addEventListener('change', loadNotifications);
});

async function updateBadge() {
  const session = Session.get();
  if(!session) return;
  const unread = await NotificationService.getUnreadCount(session.userId, 'Admin');
  Helpers.updateNotificationBadge(unread);
}

async function loadNotifications() {
  const session = Session.get();
  if(!session) return;
  
  const filter = document.getElementById('notifFilter').value;
  let notifs = await NotificationService.getNotifications(session.userId, 'Admin');
  
  if (filter === 'Unread') {
    notifs = notifs.filter(n => n.readStatus === 'Unread');
  }

  const list = document.getElementById('notifList');
  if (notifs.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-bell-slash" style="font-size:3rem;margin-bottom:1rem;color:#ccc;"></i><p>No notifications found.</p></div>`;
    return;
  }

  list.innerHTML = notifs.map(n => {
    let icon = 'fa-bell';
    if (n.notificationType.includes('SYSTEM')) icon = 'fa-server';
    else if (n.notificationType.includes('URGENT')) icon = 'fa-triangle-exclamation';

    return `
      <div class="notif-item ${n.readStatus==='Unread'?'unread':''}" onclick="markRead('${n.notificationId}')">
        <div class="notif-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="notif-content">
          <div class="notif-msg">${n.notificationMessage}</div>
          <div class="notif-meta">
            <span>${Helpers.formatDate(n.sentDate)}</span>
            <span class="badge bg-secondary">${n.notificationType}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.markRead = async function(id) {
  if(NotificationService && NotificationService.markAsRead) {
    await NotificationService.markAsRead(id);
    loadNotifications();
    updateBadge();
  }
}
