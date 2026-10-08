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

  await loadRequests();

  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.dataset.filter;
      renderTable();
    });
  });

  document.getElementById('closeReqModal').addEventListener('click', () => {
    document.getElementById('reqModal').style.display = 'none';
  });
});

let allReqs = [];
let recipients = [];
let currentFilter = 'All';

async function loadRequests() {
  allReqs = await MockData.getAll('bb_blood_requests');
  recipients = await MockData.getAll('bb_recipients');
  
  document.getElementById('cntAll').textContent = allReqs.length;
  document.getElementById('cntPA').textContent = allReqs.filter(r=>r.requestStatus==='PendingApproval').length;
  document.getElementById('cntPS').textContent = allReqs.filter(r=>r.requestStatus==='PendingStock').length;
  document.getElementById('cntA').textContent = allReqs.filter(r=>r.requestStatus==='Approved').length;
  document.getElementById('cntR').textContent = allReqs.filter(r=>r.requestStatus==='Rejected').length;
  document.getElementById('cntF').textContent = allReqs.filter(r=>r.requestStatus==='Fulfilled').length;

  renderTable();
}

function renderTable() {
  let filtered = allReqs;
  if (currentFilter !== 'All') {
    filtered = filtered.filter(r => r.requestStatus === currentFilter);
  }
  
  filtered.sort((a,b) => new Date(b.requestDate) - new Date(a.requestDate));

  const tbody = document.getElementById('requestsTable').querySelector('tbody');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No requests found.</td></tr>`;
    return;
  }

  filtered.forEach(req => {
    let actions = `<button class="btn btn-sm btn-outline" onclick="viewReq('${req.requestId}')">View Details</button>`;
    if (req.requestStatus === 'PendingApproval') {
      actions += `
        <button class="btn btn-sm btn-primary" style="margin-left:5px" onclick="approveReq('${req.requestId}')">Approve</button>
        <button class="btn btn-sm btn-danger" style="margin-left:5px" onclick="rejectReq('${req.requestId}')">Reject</button>
      `;
    } else if (req.requestStatus === 'PendingStock') {
      actions += `
        <button class="btn btn-sm btn-danger" style="margin-left:5px" onclick="rejectReq('${req.requestId}')">Reject</button>
      `;
    } else if (req.requestStatus === 'Approved') {
      actions += `<button class="btn btn-sm btn-primary" style="margin-left:5px" onclick="markFulfilled('${req.requestId}')">Mark Fulfilled</button>`;
    }

    const rec = recipients.find(r => r.recipientId === req.recipientId);
    const recName = req.recipientName || (rec ? rec.name : req.recipientId);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${req.requestId}</td>
      <td>${recName}</td>
      <td>${StatusUtils.bloodGroupBadge(req.bloodGroup)}</td>
      <td>${req.quantity}</td>
      <td>${StatusUtils.urgencyBadge(req.urgency)}</td>
      <td>${StatusUtils.requestBadge(req.requestStatus)}</td>
      <td>${Helpers.formatDate(req.requestDate)}</td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.viewReq = function(id) {
  const req = allReqs.find(r => r.requestId === id);
  if (!req) return;
  const rec = recipients.find(r => r.recipientId === req.recipientId);
  const recName = req.recipientName || (rec ? rec.name : req.recipientId);

  document.getElementById('modalReqId').textContent = req.requestId;
  document.getElementById('modalRecName').textContent = recName;
  document.getElementById('modalDate').textContent = Helpers.formatDate(req.requestDate);
  document.getElementById('modalBg').innerHTML = StatusUtils.bloodGroupBadge(req.bloodGroup);
  document.getElementById('modalQty').textContent = req.quantity + ' Units';
  document.getElementById('modalUrg').innerHTML = StatusUtils.urgencyBadge(req.urgency);
  document.getElementById('modalStatus').innerHTML = StatusUtils.requestBadge(req.requestStatus);
  document.getElementById('modalPurpose').textContent = req.purpose;
  
  if (req.rejectionReason) {
    document.getElementById('modalPurpose').innerHTML += `<br><br><span class="text-danger"><strong>Rejection Reason:</strong> ${req.rejectionReason}</span>`;
  }

  document.getElementById('trackerContainer').innerHTML = renderTracker(req);

  document.getElementById('reqModal').style.display = 'flex';
}

function renderTracker(req) {
  const states = [
      { id: 'Submitted', label: 'Submitted', icon: 'fa-file-lines' },
      { id: 'CheckingInventory', label: 'Checking', icon: 'fa-magnifying-glass' }
  ];
  if (req.requestStatus === 'PendingStock') states.push({ id: 'PendingStock', label: 'Pending Stock', icon: 'fa-boxes-stacked' });
  states.push(
      { id: 'PendingApproval', label: 'Pending Appr', icon: 'fa-clock' },
      { id: 'Approved', label: 'Approved', icon: 'fa-thumbs-up' },
      { id: 'Fulfilled', label: 'Fulfilled', icon: 'fa-check-double' }
  );
  let html = `<div class="status-tracker ${req.requestStatus === 'Rejected' ? 'has-rejected' : ''} ${req.requestStatus === 'Cancelled' ? 'has-cancelled' : ''}">`;
  if (req.requestStatus === 'Rejected') {
      html += `<div class="status-step completed"><div class="icon"><i class="fa-solid fa-file-lines"></i></div>Submitted</div><div class="status-step rejected active"><div class="icon"><i class="fa-solid fa-xmark"></i></div>Rejected</div>`;
  } else if (req.requestStatus === 'Cancelled') {
      html += `<div class="status-step completed"><div class="icon"><i class="fa-solid fa-file-lines"></i></div>Submitted</div><div class="status-step cancelled active"><div class="icon"><i class="fa-solid fa-ban"></i></div>Cancelled</div>`;
  } else {
      let reachedCurrent = false;
      states.forEach(s => {
          let sClass = '';
          if (req.requestStatus === s.id) { sClass = 'active'; reachedCurrent = true; }
          else if (!reachedCurrent) { sClass = 'completed'; }
          if (req.requestStatus === 'Fulfilled') sClass = 'completed';
          if (req.requestStatus === 'Fulfilled' && s.id === 'Fulfilled') sClass = 'active';
          html += `<div class="status-step ${sClass}"><div class="icon"><i class="fa-solid ${s.icon}"></i></div>${s.label}</div>`;
      });
  }
  html += `</div>`;
  return html;
}

window.approveReq = async function(id) {
  if(confirm('Are you sure you want to approve this request? Blood units will be issued automatically.')) {
    if(RequestService && RequestService.approve) {
      const session = Session.get();
      await RequestService.approve(id, session.userId);
      await loadRequests();
      Helpers.showToast('Request approved and fulfilled', 'success');
    }
  }
}

window.rejectReq = async function(id) {
  const reason = prompt('Enter rejection reason:');
  if(reason !== null) {
    if(RequestService && RequestService.reject) {
      const session = Session.get();
      await RequestService.reject(id, session.userId, reason);
      await loadRequests();
      Helpers.showToast('Request rejected', 'success');
    }
  }
}

window.markFulfilled = async function(id) {
  if(confirm('Mark this request as fulfilled manually?')) {
    const reqs = await MockData.getAll('bb_blood_requests');
    const req = reqs.find(r=>r.requestId===id);
    if(req) {
      req.requestStatus = 'Fulfilled';
      await MockData.update('bb_blood_requests', req.requestId, { requestStatus: 'Fulfilled' });
      await loadRequests();
      Helpers.showToast('Request marked as fulfilled', 'success');
    }
  }
}
