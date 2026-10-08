document.addEventListener('DOMContentLoaded', async () => {
    const session = Session.require('recipient');
    if (!session) return;
    
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
    
    const unread = await NotificationService.getUnreadCount(session.recipientId, 'Recipient');
    Helpers.updateNotificationBadge(unread);
    document.getElementById('notifDot').style.display = unread > 0 ? 'block' : 'none';

    const recipients = await MockData.getAll('bb_recipients');
    const recipient = recipients.find(r => r.recipientId === session.recipientId || r.userId === session.userId);
    if (recipient) {
        document.getElementById('welcomeName').textContent = \Welcome, \\;
        document.getElementById('welcomeAffiliation').textContent = \Affiliation: \\;
        
        if (recipient.approvalStatus === 'Pending') {
            document.getElementById('approvalAlert').style.display = 'block';
        }
    }

    await loadStats(session.recipientId);
    await loadRecentRequests(session.recipientId);
    await loadRecentNotifications(session.recipientId);
});

async function loadStats(recipientId) {
    const allReqs = await MockData.getAll('bb_blood_requests');
    const requests = allReqs.filter(r => r.recipientId === recipientId || r.recipient_id === recipientId);
    document.getElementById('statTotal').textContent = requests.length;
    document.getElementById('statPending').textContent = requests.filter(r => ['Submitted', 'CheckingInventory', 'PendingStock', 'PendingApproval'].includes(r.requestStatus || r.request_status)).length;
    document.getElementById('statApproved').textContent = requests.filter(r => (r.requestStatus || r.request_status) === 'Approved').length;
    document.getElementById('statFulfilled').textContent = requests.filter(r => (r.requestStatus || r.request_status) === 'Fulfilled').length;
}

async function loadRecentRequests(recipientId) {
    const allReqs = await MockData.getAll('bb_blood_requests');
    const requests = allReqs.filter(r => r.recipientId === recipientId || r.recipient_id === recipientId)
        .sort((a, b) => new Date(b.requestDate || b.request_date) - new Date(a.requestDate || a.request_date))
        .slice(0, 5);
        
    const tbody = document.querySelector('#recentRequestsTable tbody');
    if (!tbody) return;
    
    if (requests.length === 0) {
        tbody.innerHTML = \<tr><td colspan="6" class="text-center" style="padding: 2rem;">No recent requests found</td></tr>\;
        return;
    }
    
    tbody.innerHTML = requests.map(r => \
        <tr>
            <td>\</td>
            <td><span class="blood-group-pill">\</span></td>
            <td>\ Units</td>
            <td><span class="badge \">\</span></td>
            <td>\</td>
            <td>\</td>
        </tr>
    \).join('');
}

async function loadRecentNotifications(recipientId) {
    const allNotifs = await MockData.getAll('bb_notifications');
    const notifications = allNotifs.filter(n => (n.recipientId === recipientId || n.recipient_id === recipientId) && (n.recipientType === 'Recipient' || n.recipient_type === 'Recipient'))
        .sort((a, b) => new Date(b.sentDate || b.sent_date) - new Date(a.sentDate || a.sent_date))
        .slice(0, 3);
        
    const list = document.getElementById('recentNotifications');
    if (!list) return;
    
    if (notifications.length === 0) {
        list.innerHTML = \<div class="empty-state"><i class="fa-regular fa-bell-slash"></i><p>No new notifications</p></div>\;
        return;
    }
    
    list.innerHTML = notifications.map(n => \
        <div class="notification-item \">
            <div class="notification-icon"><i class="fa-solid fa-info-circle"></i></div>
            <div class="notification-content">
                <div class="notification-message">\</div>
                <div class="notification-time">\</div>
            </div>
        </div>
    \).join('');
}
