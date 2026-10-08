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

  loadDonors();

  document.getElementById('statusFilter').addEventListener('change', loadDonors);
  document.getElementById('searchInput').addEventListener('input', loadDonors);
  document.getElementById('closeDonorModal').addEventListener('click', () => {
    document.getElementById('donorModal').style.display = 'none';
  });
});

let currentDonors = [];

async function loadDonors() {
  const donors = await MockData.getAll('bb_donors');
  const filter = document.getElementById('statusFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase();

  currentDonors = donors.filter(d => {
    const status = d.registrationStatus || d.registration_status;
    const matchStatus = filter === 'All' || status === filter;
    const name = d.name || '';
    const email = d.email || '';
    const matchSearch = name.toLowerCase().includes(search) || email.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('donorsTable').querySelector('tbody');
  tbody.innerHTML = currentDonors.map(d => {
    const id = d.donorId || d.id;
    const bGroup = d.bloodGroup || d.blood_group;
    const regStatus = d.registrationStatus || d.registration_status;
    const eligStatus = d.eligibilityStatus || d.eligibility_status;
    
    return `
    <tr>
      <td>${id}</td>
      <td>${d.name || ''}</td>
      <td><span class="badge bg-danger">${bGroup || 'Not set'}</span></td>
      <td>${d.age || ''}</td>
      <td>${d.email || ''}</td>
      <td>${StatusUtils.regBadge(regStatus)}</td>
      <td>${eligStatus ? `<span class="badge ${eligStatus==='Eligible'?'bg-success':'bg-danger'}">${eligStatus}</span>` : '-'}</td>
      <td>
        <button class="action-btn" title="View Details" onclick="viewDonor('${id}')"><i class="fa-solid fa-eye"></i></button>
        ${regStatus === 'Pending' ? `
          <button class="action-btn approve" title="Approve" onclick="approveDonor('${id}')"><i class="fa-solid fa-check"></i></button>
          <button class="action-btn reject" title="Reject" onclick="rejectDonor('${id}')"><i class="fa-solid fa-xmark"></i></button>
        ` : ''}
      </td>
    </tr>
  `}).join('');
}

window.viewDonor = function(id) {
  const donor = currentDonors.find(d => (d.donorId || d.id) === id);
  if (!donor) return;
  const content = document.getElementById('donorDetailsContent');
  content.innerHTML = `
    <div class="detail-item"><div class="detail-label">Name</div><div class="detail-val">${donor.name || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Email</div><div class="detail-val">${donor.email || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-val">${donor.phone || donor.phone_number || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Blood Group</div><div class="detail-val">${donor.bloodGroup || donor.blood_group || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Age</div><div class="detail-val">${donor.age || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Weight (kg)</div><div class="detail-val">${donor.weight || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Haemoglobin (g/dL)</div><div class="detail-val">${donor.haemoglobinLevel || donor.haemoglobin_level || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Address</div><div class="detail-val">${donor.address || ''}</div></div>
    <div class="detail-item"><div class="detail-label">Health History</div><div class="detail-val">${donor.healthHistory || donor.health_history || 'None'}</div></div>
    <div class="detail-item"><div class="detail-label">Status</div><div class="detail-val">${donor.registrationStatus || donor.registration_status || ''}</div></div>
  `;
  document.getElementById('donorModal').style.display = 'block';
}

function checkEligibility(donor) {
  const criteria = JSON.parse(localStorage.getItem('bb_eligibility') || '{"minAge":18,"maxAge":65,"minWeight":50,"minHaemoglobin":12.5,"minGapDays":90}');
  const age = donor.age || donor.age;
  const weight = donor.weight || donor.weight;
  const hb = donor.haemoglobinLevel || donor.haemoglobin_level;
  const lastDonation = donor.lastDonationDate || donor.last_donation_date;

  if (age < criteria.minAge || age > criteria.maxAge) return 'Ineligible';
  if (weight < criteria.minWeight) return 'Ineligible';
  if (hb < criteria.minHaemoglobin) return 'Ineligible';
  if (lastDonation) {
    const daysSince = Math.floor((new Date() - new Date(lastDonation)) / (1000 * 60 * 60 * 24));
    if (daysSince < criteria.minGapDays) return 'Ineligible';
  }
  return 'Eligible';
}

window.approveDonor = async function(id) {
  if(!confirm('Approve this donor?')) return;
  const donors = await MockData.getAll('bb_donors');
  const index = donors.findIndex(d => (d.donorId || d.id) === id);
  if (index > -1) {
    const newElig = checkEligibility(donors[index]);
    await MockData.update('bb_donors', id, { registration_status: 'Approved', registrationStatus: 'Approved', eligibility_status: newElig, eligibilityStatus: newElig });
    const userId = donors[index].userId || donors[index].user_id;
    if (userId) await NotificationService.sendNotification(userId, 'Donor', 'Your donor registration has been approved.', 'REGISTRATION_APPROVED');
    await ActivityLogService.log('REGISTRATION_APPROVED', `Approved donor ${donors[index].name || ''} (${id})`);
    loadDonors();
    alert('Donor approved.');
  }
}

window.rejectDonor = async function(id) {
  const reason = prompt('Reason for rejection:');
  if (reason === null) return;
  const donors = await MockData.getAll('bb_donors');
  const index = donors.findIndex(d => (d.donorId || d.id) === id);
  if (index > -1) {
    await MockData.update('bb_donors', id, { registration_status: 'Rejected', registrationStatus: 'Rejected' });
    const userId = donors[index].userId || donors[index].user_id;
    if (userId) await NotificationService.sendNotification(userId, 'Donor', `Your registration was rejected. Reason: ${reason}`, 'REGISTRATION_REJECTED');
    await ActivityLogService.log('REGISTRATION_REJECTED', `Rejected donor ${donors[index].name || ''} (${id})`);
    loadDonors();
    alert('Donor rejected.');
  }
}
