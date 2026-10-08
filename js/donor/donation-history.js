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

    // Unread Notifs
    const unread = await NotificationService.getUnreadCount(session.donorId, 'Donor');
    const notifCountBadge = document.getElementById('notif-count');
    if(notifCountBadge) {
        notifCountBadge.textContent = unread;
        notifCountBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
    document.getElementById('notifDot').style.display = unread > 0 ? 'block' : 'none';

    // Load History
    const donations = (await MockData.getAll('bb_donations'))
        .filter(d => d.donorId === session.donorId)
        .sort((a,b) => new Date(b.donationDate) - new Date(a.donationDate));
    
    const camps = await MockData.getAll('bb_donation_camps');
    const tbody = document.getElementById('historyTableBody');

    if (donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No donation history found.</td></tr>';
        return;
    }

    tbody.innerHTML = donations.map(donation => {
        const camp = camps.find(c => c.campId === donation.campId);
        const campName = camp ? camp.campName : 'Unknown Camp';

        return `
            <tr>
                <td><strong>${donation.donationId}</strong></td>
                <td>${Helpers.formatDate(donation.donationDate)}</td>
                <td>${campName}</td>
                <td>${donation.unitId || '-'}</td>
                <td>${donation.certificateNumber || '-'}</td>
                <td>
                    <a href="./certificate.html?id=${donation.donationId}" class="btn btn-sm btn-outline"><i class="fa-solid fa-certificate"></i> View Cert</a>
                </td>
            </tr>
        `;
    }).join('');
});
