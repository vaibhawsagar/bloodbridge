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

    // Profile logic
    const recipients = await MockData.getAll('bb_recipients');
    let recipient = recipients.find(r => r.recipientId === session.recipientId || r.userId === session.userId);
    
    function populateForm() {
        document.getElementById('recipientId').value = recipient.recipientId || recipient.id;
        document.getElementById('name').value = recipient.name;
        document.getElementById('email').value = recipient.email;
        document.getElementById('phone').value = recipient.phone;
        document.getElementById('address').value = recipient.address;
        document.getElementById('affiliation').value = recipient.affiliation;
        const approvalEl = document.getElementById('approvalStatusBadge');
        if (approvalEl) approvalEl.innerHTML = StatusUtils.recipientApprovalBadge(recipient.approvalStatus || recipient.approval_status);
    }
    
    if (recipient) {
        populateForm();
    }

    document.getElementById('resetBtn').addEventListener('click', (e) => {
        e.preventDefault();
        populateForm();
    });

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedData = {
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            affiliation: document.getElementById('affiliation').value.trim()
        };
        
        if (!updatedData.name || !updatedData.phone || !updatedData.address || !updatedData.affiliation) {
            Helpers.showToast('Please fill all required fields', 'error');
            return;
        }

        recipient = { ...recipient, ...updatedData };
        
        await MockData.update('bb_recipients', recipient.recipientId || recipient.id, updatedData);
        
        if (session.name !== updatedData.name) {
            session.name = updatedData.name;
            Session.set(session);
            document.getElementById('userName').textContent = session.name;
            document.getElementById('userInitial').textContent = session.name.charAt(0).toUpperCase();
        }
        
        Helpers.showToast('Profile updated successfully', 'success');
    });
});
