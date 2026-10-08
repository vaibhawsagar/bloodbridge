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

    // Load Donor
    const donors = await MockData.getAll('bb_donors');
    const donor = donors.find(d => (d.donorId || d.id) === session.donorId);
    const alertBox = document.getElementById('alertBox');
    let canRegister = false;

    if (donor) {
        const status = donor.registrationStatus || donor.registration_status;
        const eligibility = donor.eligibilityStatus || donor.eligibility_status;
        canRegister = status === 'Approved' && eligibility === 'Eligible';
        if (!canRegister) {
            alertBox.className = 'alert alert-warning';
            alertBox.style.display = 'block';
            alertBox.textContent = `You cannot register for camps. Registration: ${status}, Eligibility: ${eligibility}.`;
        }
    } else {
        // Graceful fallback if donor profile is not found
        alertBox.className = 'alert alert-info';
        alertBox.style.display = 'block';
        alertBox.textContent = `Your donor profile could not be loaded. You can view camps but may not be able to register.`;
    }

    const tbody = document.getElementById('campsTableBody');
    const filterSelect = document.getElementById('filterStatus');

    async function renderCamps() {
        const allCamps = await MockData.getAll('bb_donation_camps');
        const allRegs = await MockData.getAll('bb_camp_regs');
        const regs = allRegs.filter(r => r.donorId === session.donorId);
        
        let filtered = allCamps;
        const filterVal = filterSelect.value;
        if (filterVal === 'Upcoming') filtered = allCamps.filter(c => c.status === 'Scheduled');
        else if (filterVal === 'Completed') filtered = allCamps.filter(c => c.status === 'Completed');

        filtered.sort((a,b) => new Date(b.campDate) - new Date(a.campDate));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No camps found.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(camp => {
            const statusClass = camp.status === 'Scheduled' ? 'primary' : (camp.status === 'Completed' ? 'success' : 'danger');
            
            const reg = regs.find(r => r.campId === camp.campId && r.status === 'Registered');
            let actionHtml = '';

            if (camp.status === 'Scheduled') {
                if (reg) {
                    actionHtml = `<span class="badge badge-success mb-1 d-block">Registered <i class="fa-solid fa-check"></i></span>
                                  <button class="btn btn-sm btn-outline cancel-btn" data-regid="${reg.registrationId}">Cancel</button>`;
                } else if (canRegister) {
                    actionHtml = `<button class="btn btn-sm btn-primary reg-btn" data-campid="${camp.campId}">Register</button>`;
                } else {
                    actionHtml = `<span class="badge badge-secondary">Cannot Register</span>`;
                }
            } else {
                actionHtml = `<span class="badge badge-secondary">Closed</span>`;
            }

            return `
                <tr>
                    <td><strong>${camp.campName}</strong></td>
                    <td>${Helpers.formatDate(camp.campDate)}</td>
                    <td>${camp.campVenue}</td>
                    <td>${camp.targetCollection} units</td>
                    <td><span class="badge badge-${statusClass}">${camp.status}</span></td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        }).join('');
    }

    tbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('reg-btn')) {
            const campId = e.target.getAttribute('data-campid');
            const newReg = {
                registrationId: MockData.generateId('REG'),
                donorId: session.donorId,
                campId: campId,
                registrationDate: Helpers.todayISO(),
                status: 'Registered'
            };
            await MockData.add('bb_camp_regs', newReg);
            
            await ActivityLogService.log({ actionType: 'Camp Registration', details: `Registered for camp ID: ${campId}` });
            await renderCamps();
        } else if (e.target.classList.contains('cancel-btn')) {
            if(confirm('Are you sure you want to cancel your registration?')) {
                const regId = e.target.getAttribute('data-regid');
                await MockData.update('bb_camp_regs', 'registrationId', regId, { status: 'Cancelled' });
                await ActivityLogService.log({ actionType: 'Camp Registration Cancelled', details: `Cancelled registration ID: ${regId}` });
                await renderCamps();
            }
        }
    });

    filterSelect.addEventListener('change', renderCamps);
    
    // Initial render
    renderCamps();
});
