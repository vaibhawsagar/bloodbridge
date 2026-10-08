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

    // Load Eligibility Criteria
    const criteriaList = await MockData.getAll('bb_eligibility');
    const criteria = criteriaList.length > 0 ? criteriaList[0] : { minAge:18, maxAge:65, minWeight:50, minHaemoglobin:12.5, minGapDays:90 };

    const tbody = document.getElementById('criteriaTableBody');
    tbody.innerHTML = `
        <tr><td>Age</td><td>${criteria.minAge} - ${criteria.maxAge} years</td></tr>
        <tr><td>Weight</td><td>≥ ${criteria.minWeight} kg</td></tr>
        <tr><td>Haemoglobin Level</td><td>≥ ${criteria.minHaemoglobin} g/dL</td></tr>
        <tr><td>Donation Gap</td><td>≥ ${criteria.minGapDays} days</td></tr>
    `;

    async function runCheck() {
        const donors = await MockData.getAll('bb_donors');
        const donorIndex = donors.findIndex(d => (d.donorId || d.id) === session.donorId);
        if (donorIndex === -1) return;
        const donor = donors[donorIndex];

        const passes = [];
        const issues = [];
        const checklist = [];

        const age = donor.age || donor.age;
        const weight = donor.weight || donor.weight;
        const hb = donor.haemoglobinLevel || donor.haemoglobin_level;
        const lastDonation = donor.lastDonationDate || donor.last_donation_date;
        const currentStatus = donor.eligibilityStatus || donor.eligibility_status;

        // Check each criterion
        // Age
        if (!age) {
            issues.push("Age is not set in your profile.");
            checklist.push({ title: "Age", status: false, detail: "Age is missing." });
        } else if (age >= criteria.minAge && age <= criteria.maxAge) {
            passes.push(`Age ${age} years (Required: ${criteria.minAge}–${criteria.maxAge})`);
            checklist.push({ title: "Age", status: true, detail: `Age ${age} years (Required: ${criteria.minAge}–${criteria.maxAge})` });
        } else {
            issues.push(`Age ${age} years does not meet requirement (${criteria.minAge}–${criteria.maxAge} years)`);
            checklist.push({ title: "Age", status: false, detail: `Age ${age} years does not meet requirement (${criteria.minAge}–${criteria.maxAge} years)` });
        }

        // Weight
        if (!weight) {
            issues.push("Weight is not set in your profile.");
            checklist.push({ title: "Weight", status: false, detail: "Weight is missing." });
        } else if (weight >= criteria.minWeight) {
            passes.push(`Weight ${weight} kg (Required: ≥ ${criteria.minWeight} kg)`);
            checklist.push({ title: "Weight", status: true, detail: `Weight ${weight} kg (Required: ≥ ${criteria.minWeight} kg)` });
        } else {
            issues.push(`Weight ${weight} kg is below minimum (${criteria.minWeight} kg)`);
            checklist.push({ title: "Weight", status: false, detail: `Weight ${weight} kg is below minimum (${criteria.minWeight} kg)` });
        }

        // Haemoglobin
        if (!hb) {
            issues.push("Haemoglobin Level is not set in your profile.");
            checklist.push({ title: "Haemoglobin", status: false, detail: "Haemoglobin is missing." });
        } else if (hb >= criteria.minHaemoglobin) {
            passes.push(`Haemoglobin ${hb} g/dL (Required: ≥ ${criteria.minHaemoglobin} g/dL)`);
            checklist.push({ title: "Haemoglobin", status: true, detail: `Haemoglobin ${hb} g/dL (Required: ≥ ${criteria.minHaemoglobin} g/dL)` });
        } else {
            issues.push(`Haemoglobin ${hb} g/dL is below minimum (${criteria.minHaemoglobin} g/dL)`);
            checklist.push({ title: "Haemoglobin", status: false, detail: `Haemoglobin ${hb} g/dL is below minimum (${criteria.minHaemoglobin} g/dL)` });
        }

        // Gap
        if (lastDonation) {
            const daysSince = Helpers.daysBetween(lastDonation, Helpers.todayISO());
            if (daysSince >= criteria.minGapDays) {
                passes.push(`${daysSince} days since last donation (Required: ≥ ${criteria.minGapDays} days)`);
                checklist.push({ title: "Donation Gap", status: true, detail: `${daysSince} days since last donation (Required: ≥ ${criteria.minGapDays} days)` });
            } else {
                const remaining = criteria.minGapDays - daysSince;
                issues.push(`Only ${daysSince} days since last donation. Wait ${remaining} more days (min gap: ${criteria.minGapDays} days)`);
                checklist.push({ title: "Donation Gap", status: false, detail: `Only ${daysSince} days since last donation. Wait ${remaining} more days (min gap: ${criteria.minGapDays} days)` });
            }
        } else {
            passes.push('No previous donation on record');
            checklist.push({ title: "Donation Gap", status: true, detail: "No previous donation on record" });
        }

        const isEligible = issues.length === 0;

        // Render checklist
        const clContainer = document.getElementById('checklistContainer');
        clContainer.innerHTML = checklist.map(item => `
            <div class="check-item ${item.status ? 'check-pass' : 'check-fail'}">
                <div class="check-icon"><i class="fa-solid ${item.status ? 'fa-circle-check' : 'fa-circle-xmark'}"></i></div>
                <div>
                    <strong>${item.title}</strong><br>
                    <small>${item.detail}</small>
                </div>
            </div>
        `).join('');

        // Render Result Panel
        const panel = document.getElementById('resultPanel');
        const heading = document.getElementById('resultHeading');
        const text = document.getElementById('resultText');

        panel.style.display = 'block';
        if (isEligible) {
            panel.className = 'result-panel result-eligible';
            heading.innerHTML = '<i class="fa-solid fa-thumbs-up"></i> You are Eligible to Donate!';
            text.textContent = 'You meet all the criteria based on your profile data. Thank you for saving lives!';
        } else {
            panel.className = 'result-panel result-not-eligible';
            heading.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Not Currently Eligible';
            text.textContent = 'Please address the issues highlighted above. Update your profile if your data is missing or incorrect.';
        }

        // Update Donor status
        const newStatus = isEligible ? 'Eligible' : 'Not Eligible';
        if (currentStatus !== newStatus) {
            MockData.update('bb_donors', donor.id || donor.donorId, { eligibility_status: newStatus, eligibilityStatus: newStatus });
            await ActivityLogService.log('Eligibility Check', `Donor eligibility status updated to ${newStatus}`, session.donorId);
        }
    }

    document.getElementById('checkBtn').addEventListener('click', runCheck);

    // Run automatically on load
    runCheck();
});
