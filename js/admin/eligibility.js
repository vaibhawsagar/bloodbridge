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

  loadCriteria();

  document.getElementById('eligibilityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveCriteria();
  });
});

function loadCriteria() {
  const defaultCriteria = { minAge: 18, maxAge: 65, minWeight: 50, minHaemoglobin: 12.5, minGapDays: 90 };
  const criteria = JSON.parse(localStorage.getItem('bb_eligibility')) || defaultCriteria;
  
  document.getElementById('minAge').value = criteria.minAge;
  document.getElementById('maxAge').value = criteria.maxAge;
  document.getElementById('minWeight').value = criteria.minWeight;
  document.getElementById('minHaemoglobin').value = criteria.minHaemoglobin;
  document.getElementById('minGapDays').value = criteria.minGapDays;
}

async function saveCriteria() {
  const criteria = {
    minAge: parseInt(document.getElementById('minAge').value, 10),
    maxAge: parseInt(document.getElementById('maxAge').value, 10),
    minWeight: parseInt(document.getElementById('minWeight').value, 10),
    minHaemoglobin: parseFloat(document.getElementById('minHaemoglobin').value),
    minGapDays: parseInt(document.getElementById('minGapDays').value, 10)
  };

  localStorage.setItem('bb_eligibility', JSON.stringify(criteria));
  await ActivityLogService.log('ELIGIBILITY_UPDATED', 'Admin updated eligibility criteria');
  
  // Custom toast implementation since Helpers.showToast might not exist
  alert('Eligibility criteria updated successfully!');
}
