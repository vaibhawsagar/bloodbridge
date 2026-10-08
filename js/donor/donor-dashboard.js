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

    // Load donor data
    const donor = (await MockData.getAll('bb_donors')).find(d => (d.donorId || d.id) === session.donorId);
    
    // Unread Notifs
    const unread = await NotificationService.getUnreadCount(session.donorId, 'Donor');
    const notifCountBadge = document.getElementById('notif-count');
    if(notifCountBadge) {
        notifCountBadge.textContent = unread;
        notifCountBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
    document.getElementById('notifDot').style.display = unread > 0 ? 'block' : 'none';

    // Registration Status Alert
    const regAlert = document.getElementById('regStatusAlert');
    if (donor) {
        const regStatus = donor.registrationStatus || donor.registration_status;
        const eligStatus = donor.eligibilityStatus || donor.eligibility_status;
        const bGroup = donor.bloodGroup || donor.blood_group;

        if (regStatus === 'Pending') {
            regAlert.textContent = 'Your registration is currently Pending approval by an Admin.';
            regAlert.className = 'alert alert-warning';
            regAlert.style.display = 'block';
        } else if (regStatus === 'Rejected') {
            regAlert.textContent = 'Your registration was Rejected. Please contact support.';
            regAlert.className = 'alert alert-danger';
            regAlert.style.display = 'block';
        }

        // Welcome Card
        document.getElementById('welcomeName').textContent = donor.name;
        document.getElementById('welcomeBloodGroup').textContent = bGroup || 'Not set';
        document.getElementById('welcomeBloodGroup').className = `badge badge-danger`;
        document.getElementById('welcomeEligibility').textContent = eligStatus || 'Unknown';
        document.getElementById('welcomeEligibility').className = `badge badge-${eligStatus === 'Eligible' ? 'success' : 'danger'}`;
    } else {
        document.getElementById('welcomeName').textContent = session.name || 'Donor';
        document.getElementById('welcomeBloodGroup').textContent = 'Not set';
        document.getElementById('welcomeEligibility').textContent = 'Unknown';
    }

    // Stats
    const donorIdToMatch = donor ? (donor.id || donor.donorId) : session.donorId;
    const donations = (await MockData.getAll('bb_donations')).filter(d => (d.donorId || d.id) === donorIdToMatch);
    document.getElementById('statTotalDonations').textContent = donations.length;

    const campRegs = (await MockData.getAll('bb_camp_regs')).filter(r => (r.donorId || r.id) === donorIdToMatch && r.status === 'Registered');
    document.getElementById('statRegisteredCamps').textContent = campRegs.length;

    const allCamps = await MockData.getAll('bb_donation_camps');
    const upcomingCamps = allCamps.filter(c => c.status === 'Scheduled');
    document.getElementById('statUpcomingCamps').textContent = upcomingCamps.length;

    const currentElig = donor ? (donor.eligibilityStatus || donor.eligibility_status || 'Unknown') : 'Unknown';
    document.getElementById('statEligibility').textContent = currentElig;
    document.getElementById('statEligibility').style.color = currentElig === 'Eligible' ? 'var(--success-color)' : 'var(--danger-color)';

    // Recent Notifications
    const notifs = (await MockData.getAll('bb_notifications'))
        .filter(n => n.recipientId === donorIdToMatch && n.recipientType === 'Donor')
        .sort((a,b) => new Date(b.sentDate) - new Date(a.sentDate))
        .slice(0, 3);
    const notifList = document.getElementById('recentNotificationsList');
    if (notifs.length === 0) {
        notifList.innerHTML = '<li class="empty-state"><i class="fa-solid fa-bell-slash"></i><br>No recent notifications<br><small>You\'re all caught up.</small></li>';
    } else {
        notifList.innerHTML = notifs.map(n => `
            <li class="list-item">
                <div class="list-icon ${n.readStatus === 'Unread' ? 'crimson' : ''}">
                    <i class="fa-solid fa-bell"></i>
                </div>
                <div class="list-content">
                    <div class="list-title">${n.notificationType}</div>
                    <p class="list-desc">${n.notificationMessage}</p>
                    <small style="color: #9CA3AF; font-size: 0.75rem;">${Helpers.formatDate(n.sentDate)}</small>
                </div>
            </li>
        `).join('');
    }

    // Upcoming Registered Camps
    const myUpcomingCamps = campRegs.map(r => {
        const camp = allCamps.find(c => c.campId === r.campId);
        return camp;
    }).filter(c => c && c.status === 'Scheduled')
    .sort((a,b) => new Date(a.campDate) - new Date(b.campDate))
    .slice(0, 2);

    const campsList = document.getElementById('upcomingCampsList');
    if (myUpcomingCamps.length === 0) {
        campsList.innerHTML = '<li class="empty-state"><i class="fa-solid fa-map-location-dot"></i><br>No upcoming camps<br><small>Explore available donation camps.</small></li>';
    } else {
        campsList.innerHTML = myUpcomingCamps.map(c => `
            <li class="list-item">
                <div class="list-icon crimson">
                    <i class="fa-solid fa-calendar-day"></i>
                </div>
                <div class="list-content">
                    <div class="list-title">${c.campName}</div>
                    <p class="list-desc" style="margin-bottom: 0.25rem;"><i class="fa-solid fa-clock" style="width: 14px; opacity: 0.7;"></i> ${Helpers.formatDate(c.campDate)}</p>
                    <p class="list-desc"><i class="fa-solid fa-location-dot" style="width: 14px; opacity: 0.7;"></i> ${c.campVenue}</p>
                </div>
            </li>
        `).join('');
    }
});
