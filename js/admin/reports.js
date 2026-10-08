document.addEventListener('DOMContentLoaded', async () => {
  const session = Session.require('admin');
  if (!session) return;
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault(); Session.clear(); window.location.href = '../../pages/auth/login.html';
  });
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
  overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });
  document.getElementById('userName').textContent = session.name;
  document.getElementById('userInitial').textContent = session.name.charAt(0).toUpperCase();
  const unread = await NotificationService.getUnreadCount(session.userId, 'Admin');
  Helpers.updateNotificationBadge(unread);
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  document.getElementById('reportType').addEventListener('change', generateReport);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  await generateReport();
});

let currentCSVData = '';

async function generateReport() {
  const type = document.getElementById('reportType').value;
  const container = document.getElementById('reportContainer');
  const inventory = (await MockData.getAll('bb_blood_inventory'));
  const requests = (await MockData.getAll('bb_blood_requests'));
  const donors = (await MockData.getAll('bb_donors'));
  const donations = (await MockData.getAll('bb_donations'));
  const camps = (await MockData.getAll('bb_donation_camps'));

  let html = '';
  let csv = '';
  
  if (type === 'stock') {
    const bgs = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    html = `<h2 class="report-title">Blood-Group-Wise Stock Report</h2>
            <div class="table-responsive"><table><thead><tr><th>Blood Group</th><th>Available</th><th>Reserved</th><th>Issued</th><th>Expired</th></tr></thead><tbody>`;
    csv = 'Blood Group,Available,Reserved,Issued,Expired\n';
    
    let maxAvail = 0;
    const stats = bgs.map(bg => {
      const a = inventory.filter(u=>u.bloodGroup===bg && u.unitStatus==='Available').length;
      const r = inventory.filter(u=>u.bloodGroup===bg && u.unitStatus==='Reserved').length;
      const i = inventory.filter(u=>u.bloodGroup===bg && u.unitStatus==='Issued').length;
      const e = inventory.filter(u=>u.bloodGroup===bg && u.unitStatus==='Expired').length;
      if(a > maxAvail) maxAvail = a;
      return {bg, a, r, i, e};
    });

    stats.forEach(s => {
      html += `<tr><td>${s.bg}</td><td>${s.a}</td><td>${s.r}</td><td>${s.i}</td><td>${s.e}</td></tr>`;
      csv += `${s.bg},${s.a},${s.r},${s.i},${s.e}\n`;
    });
    html += `</tbody></table></div>`;
    
    html += `<div class="chart-container"><h3>Available Stock Chart</h3>`;
    stats.forEach(s => {
      const pct = maxAvail > 0 ? (s.a / maxAvail) * 100 : 0;
      html += `<div class="bar-row"><div class="bar-label">${s.bg}</div><div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div><div class="bar-value">${s.a}</div></div>`;
    });
    html += `</div>`;
  }
  else if (type === 'collected') {
    html = `<h2 class="report-title">Units Collected Report</h2>`;
    csv = 'Donation ID,Donor ID,Date,Blood Group,Quantity\n';
    html += `<p>Total Donations: ${donations.length}</p>`;
    html += `<div class="table-responsive"><table><thead><tr><th>Donation ID</th><th>Donor ID</th><th>Date</th><th>Blood Group</th><th>Quantity (ml)</th></tr></thead><tbody>`;
    donations.forEach(d => {
      html += `<tr><td>${d.donationId}</td><td>${d.donorId}</td><td>${Helpers.formatDate(d.donationDate)}</td><td>${d.bloodGroup}</td><td>${d.quantity}</td></tr>`;
      csv += `${d.donationId},${d.donorId},${d.donationDate},${d.bloodGroup},${d.quantity}\n`;
    });
    html += `</tbody></table></div>`;
  }
  else if (type === 'expired') {
    const expired = inventory.filter(u => u.unitStatus === 'Expired');
    html = `<h2 class="report-title">Expired Units Report</h2>`;
    csv = 'Unit ID,Blood Group,Collection Date,Expiry Date\n';
    html += `<p>Total Expired Units: ${expired.length}</p>`;
    html += `<div class="table-responsive"><table><thead><tr><th>Unit ID</th><th>Blood Group</th><th>Collection Date</th><th>Expiry Date</th></tr></thead><tbody>`;
    expired.forEach(u => {
      html += `<tr><td>${u.unitId}</td><td>${u.bloodGroup}</td><td>${Helpers.formatDate(u.collectionDate)}</td><td><span style="color:red">${Helpers.formatDate(u.expiryDate)}</span></td></tr>`;
      csv += `${u.unitId},${u.bloodGroup},${u.collectionDate},${u.expiryDate}\n`;
    });
    html += `</tbody></table></div>`;
  }
  else if (type === 'fulfilled') {
    const fulfilled = requests.filter(r => r.requestStatus === 'Fulfilled');
    html = `<h2 class="report-title">Requests Fulfilled Report</h2>`;
    csv = 'Request ID,Recipient ID,Blood Group,Quantity,Date\n';
    html += `<p>Total Fulfilled Requests: ${fulfilled.length}</p>`;
    html += `<div class="table-responsive"><table><thead><tr><th>Request ID</th><th>Recipient ID</th><th>Blood Group</th><th>Quantity</th><th>Date Requested</th></tr></thead><tbody>`;
    fulfilled.forEach(r => {
      html += `<tr><td>${r.requestId}</td><td>${r.recipientId}</td><td>${r.bloodGroup}</td><td>${r.quantity}</td><td>${Helpers.formatDate(r.requestDate)}</td></tr>`;
      csv += `${r.requestId},${r.recipientId},${r.bloodGroup},${r.quantity},${r.requestDate}\n`;
    });
    html += `</tbody></table></div>`;
  }
  else if (type === 'stats') {
    html = `<h2 class="report-title">Overall Donation Statistics</h2>`;
    csv = 'Metric,Value\n';
    const totalDonors = donors.length;
    const approvedDonors = donors.filter(d=>d.registrationStatus==='Approved').length;
    const totalDonations = donations.length;
    const totalCamps = camps.filter(c=>c.status==='Completed').length;
    
    html += `<div class="table-responsive"><table><tbody>
      <tr><td>Total Registered Donors</td><td>${totalDonors}</td></tr>
      <tr><td>Approved Donors</td><td>${approvedDonors}</td></tr>
      <tr><td>Total Donations</td><td>${totalDonations}</td></tr>
      <tr><td>Completed Camps</td><td>${totalCamps}</td></tr>
    </tbody></table></div>`;
    
    csv += `Total Registered Donors,${totalDonors}\nApproved Donors,${approvedDonors}\nTotal Donations,${totalDonations}\nCompleted Camps,${totalCamps}\n`;
  }

  container.innerHTML = html;
  currentCSVData = csv;
}

function exportCSV() {
  if(!currentCSVData) return;
  const blob = new Blob([currentCSVData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `report_${document.getElementById('reportType').value}_${new Date().getTime()}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


