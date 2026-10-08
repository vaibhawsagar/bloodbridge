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

  loadCamps();

  document.getElementById('statusFilter').addEventListener('change', loadCamps);

  const modal = document.getElementById('addCampModal');
  document.getElementById('addCampBtn').addEventListener('click', () => { 
    document.getElementById('addCampForm').reset();
    document.getElementById('campId').value = '';
    document.getElementById('modalTitle').textContent = 'Schedule Camp';
    modal.style.display = 'block'; 
  });
  document.getElementById('closeAddModal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('addCampForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('campId').value;
    const name = document.getElementById('campName').value;
    const date = document.getElementById('campDate').value;
    const venue = document.getElementById('campVenue').value;
    const target = parseInt(document.getElementById('campTarget').value, 10);

    const camps = await MockData.getAll(MockData.STORAGE_KEYS.DONATION_CAMPS) || [];
    
    if (id) {
      const updates = { campName: name, campDate: date, campVenue: venue, targetCollection: target };
      await MockData.update(MockData.STORAGE_KEYS.DONATION_CAMPS, 'campId', id, updates);
      await ActivityLogService.log({ actionType: 'CAMP_UPDATED', details: `Updated camp ${id}` });
    } else {
      const newId = 'C' + (camps.length + 1).toString().padStart(3, '0');
      const newCamp = { campId: newId, campName: name, campDate: date, campVenue: venue, targetCollection: target, status: 'Scheduled' };
      await MockData.add(MockData.STORAGE_KEYS.DONATION_CAMPS, newCamp);
      await ActivityLogService.log({ actionType: 'CAMP_SCHEDULED', details: `Scheduled camp ${newId}` });
    }
    
    modal.style.display = 'none';
    await loadCamps();
    alert('Camp saved!');
  });
});

let allCamps = [];
let campRegs = [];

async function loadCamps() {
  allCamps = await MockData.getAll(MockData.STORAGE_KEYS.DONATION_CAMPS) || [];
  campRegs = await MockData.getAll(MockData.STORAGE_KEYS.CAMP_REGS) || [];
  renderTable();
}

function renderTable() {
  const filter = document.getElementById('statusFilter').value;
  let filtered = allCamps;
  if(filter !== 'All') {
    filtered = filtered.filter(c => c.status === filter);
  }

  const tbody = document.getElementById('campsTable').querySelector('tbody');
  tbody.innerHTML = filtered.map(c => {
    const regCount = campRegs.filter(r => (r.campId === c.campId || r.campId === c.id) && r.status === 'Registered').length;
    let actions = '';
    if (c.status === 'Scheduled') {
      actions = `
        <button class="action-btn" style="color: #28a745" title="Mark Completed & Log Donations" onclick="openCompleteCampModal('${c.campId || c.id}')"><i class="fa-solid fa-check-double"></i></button>
        <button class="action-btn" title="Edit" onclick="editCamp('${c.campId || c.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="action-btn cancel" title="Cancel" onclick="cancelCamp('${c.campId || c.id}')"><i class="fa-solid fa-ban"></i></button>
      `;
    }
    return `<tr>
      <td>${c.campId || c.id}</td>
      <td>${c.campName}</td>
      <td>${Helpers.formatDate(c.campDate)}</td>
      <td>${c.campVenue}</td>
      <td>${c.targetCollection}</td>
      <td>${regCount}</td>
      <td>${StatusUtils.campBadge(c.status)}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

window.editCamp = function(id) {
  const camp = allCamps.find(c => c.campId === id);
  if(!camp) return;
  document.getElementById('campId').value = camp.campId;
  document.getElementById('campName').value = camp.campName;
  document.getElementById('campDate').value = camp.campDate;
  document.getElementById('campVenue').value = camp.campVenue;
  document.getElementById('campTarget').value = camp.targetCollection;
  document.getElementById('modalTitle').textContent = 'Edit Camp';
  document.getElementById('addCampModal').style.display = 'block';
}

window.cancelCamp = async function(id) {
  if(!confirm('Are you sure you want to cancel this camp?')) return;
  await MockData.update(MockData.STORAGE_KEYS.DONATION_CAMPS, 'campId', id, { status: 'Cancelled' });
  await ActivityLogService.log({ actionType: 'CAMP_CANCELLED', details: `Cancelled camp ${id}` });
  await loadCamps();
}

// ── Complete Camp Modal ────────────────────────────────────────────
const completeCampModal = document.getElementById('completeCampModal');
document.getElementById('closeCompleteModal').addEventListener('click', () => {
  completeCampModal.style.display = 'none';
});

window.openCompleteCampModal = async function(campId) {
  document.getElementById('completeCampId').value = campId;
  const listEl = document.getElementById('registeredDonorsList');
  listEl.innerHTML = '<p style="color:#6b7280">Loading registered donors...</p>';
  completeCampModal.style.display = 'block';

  try {
    const res = await fetch(`http://localhost:3000/api/camps/${campId}/registrations`);
    const data = await res.json();
    const regs = (data.data || []).filter(r => r.status === 'Registered');

    if (regs.length === 0) {
      listEl.innerHTML = '<p style="color:#6b7280; text-align:center; padding: 1rem;">No registered donors for this camp.</p>';
      return;
    }

    listEl.innerHTML = regs.map(r => `
      <label style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0; border-bottom:1px solid #f0f0f0; cursor:pointer;">
        <input type="checkbox" class="donor-check" value="${r.donorId}" style="width:18px;height:18px;cursor:pointer;" checked>
        <div>
          <div style="font-weight:600">${r.name}</div>
          <div style="font-size:0.8rem; color:#6b7280">${r.email} &nbsp;•&nbsp; <span style="color:#c62828;font-weight:600">${r.bloodGroup}</span></div>
        </div>
      </label>
    `).join('');
  } catch (e) {
    listEl.innerHTML = `<p style="color:#dc3545">Failed to load donors: ${e.message}</p>`;
  }
};

document.getElementById('submitCompleteCampBtn').addEventListener('click', async () => {
  const campId = document.getElementById('completeCampId').value;
  const checked = [...document.querySelectorAll('.donor-check:checked')].map(cb => cb.value);

  const btn = document.getElementById('submitCompleteCampBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

  try {
    const res = await fetch(`http://localhost:3000/api/camps/${campId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorIds: checked })
    });
    const data = await res.json();

    if (data.success) {
      completeCampModal.style.display = 'none';
      await loadCamps();
      alert(`✅ ${data.message}\n\nDonations logged and blood inventory updated automatically!`);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (e) {
    alert('Request failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Mark Camp Completed';
  }
});

