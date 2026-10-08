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

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const donationIdParam = urlParams.get('id');

    const donations = (await MockData.getAll('bb_donations')).filter(d => d.donorId === session.donorId);
    let donation;

    if (donationIdParam) {
        donation = donations.find(d => d.donationId === donationIdParam);
    } else {
        // Get latest
        if (donations.length > 0) {
            donations.sort((a,b) => new Date(b.donationDate) - new Date(a.donationDate));
            donation = donations[0];
        }
    }

    const noCertMsg = document.getElementById('noCertMsg');
    const certWrapper = document.getElementById('certWrapper');
    const actionButtons = document.getElementById('actionButtons');

    if (!donation) {
        noCertMsg.style.display = 'block';
    } else {
        const donor = (await MockData.getAll('bb_donors')).find(d => d.donorId === session.donorId);
        const camp = (await MockData.getAll('bb_donation_camps')).find(c => c.campId === donation.campId);

        document.getElementById('certDonorName').textContent = donor ? donor.name : session.name;
        document.getElementById('certBloodGroup').textContent = donor && donor.bloodGroup ? donor.bloodGroup : 'Not Specified';
        document.getElementById('certDate').textContent = Helpers.formatDate(donation.donationDate);
        document.getElementById('certCampName').textContent = camp ? camp.campName : 'BloodBridge Camp';
        document.getElementById('certNo').textContent = donation.certificateNumber || donation.donationId;

        certWrapper.style.display = 'block';
        actionButtons.style.display = 'block';
    }
});
