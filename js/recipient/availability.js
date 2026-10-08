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

    // Availability logic
    async function loadAvailability() {
        const bgFilter = document.getElementById('bloodGroupFilter').value;
        const searchLoc = document.getElementById('searchLocation').value.toLowerCase();
        
        let summary = await InventoryService.getStockSummary();
        
        if (bgFilter !== 'All') {
            const filtered = {};
            if (summary[bgFilter] !== undefined) {
                filtered[bgFilter] = summary[bgFilter];
            }
            summary = filtered;
        }

        const tbody = document.querySelector('#availabilityTable tbody');
        tbody.innerHTML = '';
        
        const bloodGroups = Object.keys(summary);
        if (bloodGroups.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">No data available for selected filters.</td></tr>`;
            return;
        }
        
        // Ensure standard ordering if showing all
        const orderedGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const displayGroups = bgFilter === 'All' ? orderedGroups.filter(bg => summary[bg] !== undefined) : bloodGroups;

        displayGroups.forEach(bg => {
            const count = summary[bg];
            let statusColor, statusText;
            
            if (count === 0) {
                statusColor = 'var(--danger-color)';
                statusText = 'Out of Stock';
            } else if (count <= 5) {
                statusColor = 'var(--warning-color)';
                statusText = 'Low Stock';
            } else {
                statusColor = 'var(--success-color)';
                statusText = 'Available';
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${StatusUtils.bloodGroupBadge(bg)}</td>
                <td><span class="fs-4 fw-bold" style="color: ${statusColor}">${count}</span> Units</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge" style="background-color: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}">${statusText}</span>
                    </div>
                </td>
                <td class="text-end">
                    <a href="./request-blood.html?bg=${encodeURIComponent(bg)}" class="btn btn-sm btn-primary">Request ${bg}</a>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('bloodGroupFilter').addEventListener('change', loadAvailability);
    document.getElementById('searchLocation').addEventListener('input', loadAvailability);
    document.getElementById('refreshBtn').addEventListener('click', loadAvailability);

    loadAvailability();
});
