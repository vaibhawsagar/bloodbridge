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

    // Pre-fill blood group if passed in URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('bg')) {
        document.getElementById('bloodGroup').value = params.get('bg');
    }

    const recipients = await MockData.getAll('bb_recipients');
    const recipient = recipients.find(r => r.recipientId === session.recipientId || r.userId === session.userId);

    const alertBox = document.getElementById('approvalAlert');
    const submitBtn = document.getElementById('submitBtn');
    
    if (recipient && recipient.approvalStatus !== 'Approved' && recipient.approval_status !== 'Approved') {
        alertBox.style.display = 'block';
        alertBox.innerHTML = \<i class="fa-solid fa-triangle-exclamation"></i> Your account is currently <strong>\</strong>. You cannot request blood until approved.\;
        submitBtn.disabled = true;
    }

    document.getElementById('bloodGroup').addEventListener('change', async (e) => {
        const bg = e.target.value;
        const stockInfo = document.getElementById('stockInfo');
        if (!bg) {
            stockInfo.style.display = 'none';
            return;
        }
        
        const summary = await InventoryService.getStockSummary();
        const available = summary.find(s => s.bloodGroup === bg)?.available || 0;
        
        stockInfo.style.display = 'block';
        stockInfo.className = \lert \\;
        
        if (available > 0) {
            stockInfo.innerHTML = \<i class="fa-solid fa-check-circle"></i> We currently have <strong>\ units</strong> of \ available in stock.\;
        } else {
            stockInfo.innerHTML = \<i class="fa-solid fa-triangle-exclamation"></i> We currently have <strong>no \ units</strong> available. Your request will be placed on pending until stock is available.\;
        }
    });

    if (document.getElementById('bloodGroup').value) {
        document.getElementById('bloodGroup').dispatchEvent(new Event('change'));
    }

    document.getElementById('clearBtn').addEventListener('click', () => {
        document.getElementById('requestForm').reset();
        document.getElementById('stockInfo').style.display = 'none';
    });

    document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (recipient && recipient.approvalStatus !== 'Approved' && recipient.approval_status !== 'Approved') {
            Helpers.showToast('You must be approved to request blood', 'error');
            return;
        }
        
        const bgEl = document.getElementById('bloodGroup');
        const qtyEl = document.getElementById('quantity');
        const urgEl = document.getElementById('urgency');
        const purpEl = document.getElementById('purpose');
        
        const validationObj = {
            bloodGroupEl: bgEl,
            quantityEl: qtyEl,
            urgencyEl: urgEl,
            purposeEl: purpEl
        };
        
        if (Validation.validateBloodRequest && !Validation.validateBloodRequest(validationObj)) {
            return;
        }

        const data = {
            recipientId: session.recipientId,
            bloodGroup: bgEl.value,
            quantity: parseInt(qtyEl.value, 10),
            urgency: urgEl.value,
            purpose: purpEl.value.trim()
        };
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        
        try {
            await RequestService.submit(data);
            Helpers.showToast('Blood request submitted successfully', 'success');
            setTimeout(() => {
                window.location.href = './request-tracking.html?new=true';
            }, 1500);
        } catch (error) {
            Helpers.showToast(error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Request';
        }
    });
});
