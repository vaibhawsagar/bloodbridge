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

    // Load donor data
    const donors = await MockData.getAll('bb_donors');
    const donorIndex = donors.findIndex(d => (d.donorId || d.id) === session.donorId);
    if (donorIndex === -1) return;
    const donor = donors[donorIndex];

    // Populate form (handling both local camelCase and API snake_case)
    document.getElementById('donorName').value = donor.name || '';
    document.getElementById('donorEmail').value = donor.email || '';
    document.getElementById('donorPhone').value = donor.phone || donor.phone_number || '';
    document.getElementById('donorBloodGroup').value = donor.bloodGroup || donor.blood_group || '';
    document.getElementById('donorAddress').value = donor.address || '';
    document.getElementById('donorWeight').value = donor.weight || '';
    document.getElementById('donorHaemoglobin').value = donor.haemoglobinLevel || donor.haemoglobin_level || '';
    document.getElementById('donorAge').value = donor.age || '';
    document.getElementById('donorLastDonation').value = donor.lastDonationDate || donor.last_donation_date || '';
    document.getElementById('donorHealthHistory').value = donor.healthHistory || donor.health_history || '';

    // Handle save
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const updates = {
            name: document.getElementById('donorName').value,
            phone: document.getElementById('donorPhone').value,
            address: document.getElementById('donorAddress').value,
            weight: parseFloat(document.getElementById('donorWeight').value) || null,
            haemoglobinLevel: parseFloat(document.getElementById('donorHaemoglobin').value) || null,
            age: parseInt(document.getElementById('donorAge').value, 10) || null,
            lastDonationDate: document.getElementById('donorLastDonation').value || null,
            healthHistory: document.getElementById('donorHealthHistory').value
        };

        // Also map to snake_case just in case backend requires it
        updates.phone_number = updates.phone;
        updates.haemoglobin_level = updates.haemoglobinLevel;
        updates.last_donation_date = updates.lastDonationDate;
        updates.health_history = updates.healthHistory;

        MockData.update('bb_donors', donor.id || donor.donorId, updates);

        Object.assign(donor, updates);

        // Update session name if changed
        if (session.name !== donor.name) {
            session.name = donor.name;
            localStorage.setItem('bb_session', JSON.stringify(session));
            document.getElementById('userName').textContent = session.name;
            document.getElementById('userInitial').textContent = session.name.charAt(0).toUpperCase();
        }

        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    });
});
