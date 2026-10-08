document.addEventListener('DOMContentLoaded', async () => {
    const session = Session.require('donor');
    if (!session) return;

    // Sidebar & Logout Setup
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        Session.clear();
        window.location.href = '../../pages/auth/login.html';
    });

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    document.getElementById('menuToggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    document.getElementById('userName').textContent = session.name;
    document.getElementById('userInitial').textContent = session.name.charAt(0).toUpperCase();

    const notifListEl = document.getElementById('notifList');
    const filterSelect = document.getElementById('notifFilter');
    
    async function updateHeaderBadges() {
        const unread = await NotificationService.getUnreadCount(session.donorId, 'Donor');
        const notifCountBadge = document.getElementById('notif-count');
        if(notifCountBadge) {
            notifCountBadge.textContent = unread;
            notifCountBadge.style.display = unread > 0 ? 'inline-block' : 'none';
        }
        document.getElementById('notifDot').style.display = unread > 0 ? 'block' : 'none';
    }

    async function renderNotifications() {
        const allNotifs = await MockData.getAll('bb_notifications').then(list => list.filter(n => n.recipientId === session.donorId && n.recipientType === 'Donor'));
        allNotifs.sort((a,b) => new Date(b.sentDate) - new Date(a.sentDate));
        
        const filterVal = filterSelect.value;
        let filtered = allNotifs;
        if (filterVal === 'Unread') filtered = allNotifs.filter(n => n.readStatus === 'Unread');
        if (filterVal === 'Read') filtered = allNotifs.filter(n => n.readStatus === 'Read');

        if (filtered.length === 0) {
            notifListEl.innerHTML = '<div style="padding: 20px; text-align: center;">No notifications found.</div>';
            return;
        }

        notifListEl.innerHTML = filtered.map(n => {
            let iconClass = 'fa-bell';
            let bgClass = '#6c757d';
            
            if (n.notificationType === 'Camp Reminder') { iconClass = 'fa-calendar-day'; bgClass = '#17a2b8'; }
            else if (n.notificationType === 'Status Update') { iconClass = 'fa-pen-to-square'; bgClass = '#007bff'; }
            else if (n.notificationType === 'Eligibility') { iconClass = 'fa-heart-pulse'; bgClass = '#28a745'; }

            return `
                <div class="notif-item ${n.readStatus === 'Unread' ? 'unread' : ''}" data-id="${n.notificationId}" style="cursor: pointer;">
                    <div class="notif-icon" style="background: ${bgClass};"><i class="fa-solid ${iconClass}"></i></div>
                    <div class="notif-content">
                        <div class="notif-title"><span class="badge badge-secondary mr-2">${n.notificationType}</span></div>
                        <div class="notif-text">${n.notificationMessage}</div>
                        <div class="notif-meta">${Helpers.formatDate(n.sentDate)}</div>
                    </div>
                    <div class="notif-dot"></div>
                </div>
            `;
        }).join('');
        
        updateHeaderBadges();
    }

    notifListEl.addEventListener('click', async (e) => {
        const item = e.target.closest('.notif-item');
        if (item && item.classList.contains('unread')) {
            const notifId = item.getAttribute('data-id');
            await NotificationService.markAsRead(notifId);
            renderNotifications();
        }
    });

    document.getElementById('markAllBtn').addEventListener('click', async () => {
        await NotificationService.markAllAsRead(session.donorId, 'Donor');
        renderNotifications();
    });

    filterSelect.addEventListener('change', renderNotifications);

    // Initial load
    renderNotifications();
});
