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
    
    const unread = await NotificationService.getUnreadCount(session.recipientId, 'Recipient');
    Helpers.updateNotificationBadge(unread);
    document.getElementById('notifDot').style.display = unread > 0 ? 'block' : 'none';

    // Success check
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
        Helpers.showToast('Blood request submitted successfully', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const container = document.getElementById('requestsContainer');
    const filterSelect = document.getElementById('statusFilter');

    function renderTracker(req) {
        const hasPendingStock = req.requestStatus === 'PendingStock' || 
            (req.requestStatus === 'Fulfilled' && req._wasPendingStock); // _wasPendingStock is hypothetical, but we'll adapt.
            
        // Standard ordered states
        const states = [
            { id: 'Submitted', label: 'Submitted', icon: 'fa-file-lines' },
            { id: 'CheckingInventory', label: 'Checking', icon: 'fa-magnifying-glass' }
        ];

        if (req.requestStatus === 'PendingStock') {
            states.push({ id: 'PendingStock', label: 'Pending Stock', icon: 'fa-boxes-stacked' });
        }
        
        states.push(
            { id: 'PendingApproval', label: 'Pending Appr', icon: 'fa-clock' },
            { id: 'Approved', label: 'Approved', icon: 'fa-thumbs-up' },
            { id: 'Fulfilled', label: 'Fulfilled', icon: 'fa-check-double' }
        );

        let html = `<div class="status-tracker ${req.requestStatus === 'Rejected' ? 'has-rejected' : ''} ${req.requestStatus === 'Cancelled' ? 'has-cancelled' : ''}">`;
        
        if (req.requestStatus === 'Rejected') {
            html += `
                <div class="status-step completed"><div class="icon"><i class="fa-solid fa-file-lines"></i></div>Submitted</div>
                <div class="status-step rejected active"><div class="icon"><i class="fa-solid fa-xmark"></i></div>Rejected</div>
            `;
        } else if (req.requestStatus === 'Cancelled') {
            html += `
                <div class="status-step completed"><div class="icon"><i class="fa-solid fa-file-lines"></i></div>Submitted</div>
                <div class="status-step cancelled active"><div class="icon"><i class="fa-solid fa-ban"></i></div>Cancelled</div>
            `;
        } else {
            let reachedCurrent = false;
            states.forEach(s => {
                let sClass = '';
                if (req.requestStatus === s.id) {
                    sClass = 'active';
                    reachedCurrent = true;
                } else if (!reachedCurrent) {
                    sClass = 'completed';
                }
                
                // If it's fulfilled, all are completed except the last which is active or completed
                if (req.requestStatus === 'Fulfilled') sClass = 'completed';
                if (req.requestStatus === 'Fulfilled' && s.id === 'Fulfilled') sClass = 'active';

                html += `<div class="status-step ${sClass}"><div class="icon"><i class="fa-solid ${s.icon}"></i></div>${s.label}</div>`;
            });
        }
        
        html += `</div>`;
        return html;
    }

    function loadRequests() {
        const filter = filterSelect.value;
        const allRequests = (await MockData.getAll('bb_blood_requests')).filter(r => r.recipientId === session.recipientId)
            .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
            
        let filtered = allRequests;
        if (filter !== 'All') {
            if (filter === 'Active') {
                filtered = allRequests.filter(r => !['Fulfilled', 'Rejected', 'Cancelled'].includes(r.requestStatus));
            } else {
                filtered = allRequests.filter(r => r.requestStatus === filter);
            }
        }

        container.innerHTML = '';
        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center p-5 text-muted">No requests found matching criteria.</div>`;
            return;
        }

        filtered.forEach(req => {
            const el = document.createElement('div');
            el.className = 'request-card';
            
            const canCancel = ['Submitted', 'CheckingInventory', 'PendingStock', 'PendingApproval'].includes(req.requestStatus);
            
            el.innerHTML = `
                <div class="request-header" onclick="this.nextElementSibling.classList.toggle('expanded')">
                    <div class="d-flex align-items-center gap-3">
                        <i class="fa-solid fa-chevron-down text-muted"></i>
                        <div>
                            <strong>Req #${req.requestId}</strong>
                            <span class="text-muted ms-2">${Helpers.formatDate(req.requestDate)}</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        ${StatusUtils.bloodGroupBadge(req.bloodGroup)}
                        <span class="badge badge-outline">${req.quantity} Units</span>
                        ${StatusUtils.requestBadge(req.requestStatus)}
                    </div>
                </div>
                <div class="request-body">
                    ${renderTracker(req)}
                    
                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <p class="text-sm text-muted mb-1">Urgency</p>
                            <p>${StatusUtils.urgencyBadge(req.urgency)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-muted mb-1">Purpose</p>
                            <p>${req.purpose}</p>
                        </div>
                        ${req.approvalDate ? `
                        <div>
                            <p class="text-sm text-muted mb-1">Approval Date</p>
                            <p>${Helpers.formatDate(req.approvalDate)}</p>
                        </div>` : ''}
                        ${req.rejectionReason ? `
                        <div class="col-span-2">
                            <p class="text-sm text-muted mb-1">Rejection Reason</p>
                            <p class="text-danger">${req.rejectionReason}</p>
                        </div>` : ''}
                    </div>
                    
                    ${canCancel ? `
                    <div class="d-flex justify-content-end mt-4 pt-3 border-top">
                        <button class="btn btn-sm btn-outline-danger cancel-btn" data-id="${req.requestId}">Cancel Request</button>
                    </div>` : ''}
                </div>
            `;
            container.appendChild(el);
        });

        // Add cancel event listeners
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if(confirm('Are you sure you want to cancel this request?')) {
                    const id = e.target.getAttribute('data-id');
                    if(await RequestService.cancel(id)) {
                        Helpers.showToast('Request cancelled successfully', 'success');
                        loadRequests();
                    } else {
                        Helpers.showToast('Failed to cancel request', 'error');
                    }
                }
            });
        });
    }

    filterSelect.addEventListener('change', loadRequests);
    loadRequests();
});

