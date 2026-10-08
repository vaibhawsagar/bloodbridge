document.addEventListener('DOMContentLoaded', async () => {
  const session = Session.require('admin');
  if (!session) return;
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault(); Session.clear(); window.location.href = '../../pages/auth/login.html';
  });
  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });
  // User info
  document.getElementById('userName').textContent = session.name;
  document.getElementById('userInitial').textContent = session.name.charAt(0).toUpperCase();
  // Notification badge
  const unread = await NotificationService.getUnreadCount(session.userId, 'Admin');
  Helpers.updateNotificationBadge(unread);
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  await loadDashboardData();
});

async function loadDashboardData() {
  const donors = (await MockData.getAll('bb_donors'));
  const inventory = (await MockData.getAll('bb_blood_inventory'));
  const requests = (await MockData.getAll('bb_blood_requests'));
  const camps = (await MockData.getAll('bb_donation_camps'));
  const recipients = (await MockData.getAll('bb_recipients'));
  const activityLog = (await MockData.getAll('bb_activity_log'));

  // Stats
  document.getElementById('statDonors').textContent = donors.length;
  document.getElementById('statPendingApprovals').textContent = donors.filter(d => d.registrationStatus === 'Pending').length;
  document.getElementById('statInventory').textContent = inventory.filter(u => u.unitStatus === 'Available').length;
  document.getElementById('statPendingRequests').textContent = requests.filter(r => r.requestStatus === 'PendingApproval' || r.requestStatus === 'PendingStock').length;
  document.getElementById('statCamps').textContent = camps.filter(c => c.status === 'Scheduled').length;
  document.getElementById('statRecipients').textContent = recipients.length;

  // Alerts
  const alertsContainer = document.getElementById('alertsContainer');
  let alertsHTML = '';
  
  const pendingDonors = donors.filter(d => d.registrationStatus === 'Pending').length;
  if (pendingDonors > 0) alertsHTML += `<div class="alert-item alert-warning"><div class="alert-content"><i class="fa-solid fa-users-clock"></i> ${pendingDonors} Pending Donor Registrations</div><a href="./donors.html" class="alert-action">View &rarr;</a></div>`;
  
  const pendingReqs = requests.filter(r => r.requestStatus === 'PendingApproval').length;
  if (pendingReqs > 0) alertsHTML += `<div class="alert-item alert-danger"><div class="alert-content"><i class="fa-solid fa-file-circle-exclamation"></i> ${pendingReqs} Pending Blood Requests</div><a href="./blood-requests.html" class="alert-action">View &rarr;</a></div>`;

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  let lowStockAlerts = 0;
  const inventorySummaryHTML = bloodGroups.map(bg => {
    const available = inventory.filter(u => u.bloodGroup === bg && u.unitStatus === 'Available').reduce((sum, u) => sum + u.quantity, 0);
    const reserved = inventory.filter(u => u.bloodGroup === bg && u.unitStatus === 'Reserved').reduce((sum, u) => sum + u.quantity, 0);
    const expired = inventory.filter(u => u.bloodGroup === bg && u.unitStatus === 'Expired').reduce((sum, u) => sum + u.quantity, 0);
    
    if (available < 5) {
      alertsHTML += `<div class="alert-item alert-danger"><div class="alert-content"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock: ${bg} (${available} units)</div><a href="./inventory.html" class="alert-action">View &rarr;</a></div>`;
      lowStockAlerts++;
    }
    
    // Tiny inline bar visualization for available stock (max 50 mapped to 40px width)
    const barWidth = Math.min((available / 50) * 40, 40);
    const barHtml = `<div style="display:inline-block; width: 40px; height: 4px; background: #E5E7EB; border-radius: 2px; margin-left: 8px; vertical-align: middle;"><div style="width: ${barWidth}px; height: 100%; background: ${available < 5 ? '#EF4444' : '#10B981'}; border-radius: 2px;"></div></div>`;
    
    return `<tr>
        <td><span class="badge badge-blood">${bg}</span></td>
        <td><span style="font-weight:700; color: ${available < 5 ? '#991B1B' : '#111827'};">${available}</span> ${barHtml}</td>
        <td>${reserved}</td>
        <td>${expired}</td>
    </tr>`;
  }).join('');

  if (!alertsHTML) alertsHTML = '<div class="alert-item alert-success" style="justify-content: center;"><div class="alert-content"><i class="fa-solid fa-circle-check"></i> All caught up! No urgent alerts.</div></div>';
  alertsContainer.innerHTML = alertsHTML;

  // Inventory Summary
  document.getElementById('inventorySummaryTable').querySelector('tbody').innerHTML = inventorySummaryHTML;

  // Recent Requests
  const sortedReqs = [...requests].sort((a,b) => new Date(b.requestDate) - new Date(a.requestDate)).slice(0,5);
  const reqsBody = document.getElementById('recentRequestsTable').querySelector('tbody');
  if (sortedReqs.length === 0) {
      reqsBody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-file-waveform"></i><br>No recent blood requests</td></tr>';
  } else {
      reqsBody.innerHTML = sortedReqs.map(r => {
        const rec = recipients.find(rc => rc.recipientId === r.recipientId);
        return `<tr>
          <td><span style="font-weight:600;">${rec ? rec.name : 'Unknown'}</span></td>
          <td><span class="badge badge-blood">${r.bloodGroup}</span></td>
          <td>${StatusUtils.urgencyBadge(r.urgency)}</td>
          <td>${StatusUtils.requestBadge(r.requestStatus)}</td>
        </tr>`;
      }).join('');
  }

  // Recent Activity
  const sortedActivity = [...activityLog].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,5);
  const activityBody = document.getElementById('recentActivityTable').querySelector('tbody');
  if (sortedActivity.length === 0) {
      activityBody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fa-solid fa-list-check"></i><br>No recent activity recorded</td></tr>';
  } else {
      activityBody.innerHTML = sortedActivity.map(a => `
        <tr>
          <td><span class="badge badge-gray">${a.actionType}</span></td>
          <td>${a.details}</td>
          <td style="color: #6B7280; font-size: 0.85rem;">${Helpers.formatDate(a.timestamp)}</td>
        </tr>
      `).join('');
  }
}


