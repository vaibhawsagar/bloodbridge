document.addEventListener('DOMContentLoaded', async () => {
    const session = Session.require('recipient');
    if (!session) return;
    
    // Sidebar common logic
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

    // Notifications logic
    const container = document.getElementById('notificationContainer');
    let currentFilter = 'All'; // 'All' or 'Unread'

    async function updateNavBadge() {
        const unread = await NotificationService.getUnreadCount(session.recipientId, 'Recipient');
        Helpers.updateNotificationBadge(unread);
        document.getElementById('notifDot').style.display = unread > 0 ? 'block' : 'none';
    }

    async function loadNotifications() {
        const allNotifs = await NotificationService.getNotifications(session.recipientId, 'Recipient');
        let displayNotifs = allNotifs;
        
        if (currentFilter === 'Unread') {
            displayNotifs = allNotifs.filter(n => n.readStatus === 'Unread');
        }

        container.innerHTML = '';
        if (displayNotifs.length === 0) {
            container.innerHTML = `<div class="p-5 text-center text-muted">No notifications to show.</div>`;
            return;
        }

        displayNotifs.forEach(n => {
            const item = document.createElement('div');
            item.className = `notification-item p-3 border-bottom cursor-pointer ${n.readStatus === 'Unread' ? 'unread bg-light' : ''}`;
            
            let iconClass = 'fa-bell text-primary';
            if (n.notificationType === 'Approval') iconClass = 'fa-check text-success';
            if (n.notificationType === 'Rejection') iconClass = 'fa-xmark text-danger';
            if (n.notificationType === 'System') iconClass = 'fa-gear text-secondary';
            if (n.notificationType === 'RequestStatus') iconClass = 'fa-route text-info';

            item.innerHTML = `
                <div class="d-flex gap-3 align-items-start">
                    <div class="mt-1"><i class="fa-solid ${iconClass} fs-5"></i></div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <span class="badge bg-secondary badge-outline text-xs">${n.notificationType}</span>
                            <small class="text-muted">${Helpers.formatDateTime(n.sentDate)}</small>
                        </div>
                        <div>${n.notificationMessage}</div>
                    </div>
                    ${n.readStatus === 'Unread' ? '<div class="align-self-center"><span class="badge bg-primary rounded-circle p-1"></span></div>' : ''}
                </div>
            `;

            item.addEventListener('click', async () => {
                if (n.readStatus === 'Unread') {
                    await NotificationService.markAsRead(n.notificationId);
                    loadNotifications();
                    updateNavBadge();
                }
            });

            container.appendChild(item);
        });
        
        updateNavBadge();
    }

    document.getElementById('filterAll').addEventListener('click', (e) => {
        currentFilter = 'All';
        e.target.classList.add('active');
        document.getElementById('filterUnread').classList.remove('active');
        loadNotifications();
    });

    document.getElementById('filterUnread').addEventListener('click', (e) => {
        currentFilter = 'Unread';
        e.target.classList.add('active');
        document.getElementById('filterAll').classList.remove('active');
        loadNotifications();
    });

    document.getElementById('markAllReadBtn').addEventListener('click', async () => {
        await NotificationService.markAllAsRead(session.recipientId, 'Recipient');
        loadNotifications();
    });

    loadNotifications();
});

