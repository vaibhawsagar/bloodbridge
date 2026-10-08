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

  await loadLogs();

  document.getElementById('typeFilter').addEventListener('change', renderTable);
  document.getElementById('searchInput').addEventListener('input', renderTable);
});

let allLogs = [];

async function loadLogs() {
  allLogs = (await MockData.getAll('bb_activity_log'));
  allLogs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  renderTable();
}

function getLogColor(type) {
  if(type.includes('APPROVED')) return '#28a745';
  if(type.includes('REJECTED') || type.includes('CANCELLED')) return '#dc3545';
  if(type.includes('UPDATE')) return '#007bff';
  if(type.includes('CHANGED')) return '#fd7e14';
  if(type.includes('ISSUED')) return '#6f42c1';
  if(type.includes('SCHEDULED')) return '#20c997';
  return '#6c757d';
}

function renderTable() {
  const typeFilter = document.getElementById('typeFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase();
  
  let filtered = allLogs.filter(l => {
    const matchType = typeFilter === 'All' || l.actionType === typeFilter;
    const matchSearch = l.details.toLowerCase().includes(search);
    return matchType && matchSearch;
  });

  const tbody = document.getElementById('logTable').querySelector('tbody');
  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td>${l.logId}</td>
      <td><span class="log-badge" style="background-color:${getLogColor(l.actionType)}">${l.actionType}</span></td>
      <td>${l.details}</td>
      <td>${Helpers.formatDate(l.timestamp)}</td>
    </tr>
  `).join('');
}

