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

  if (InventoryService && await InventoryService.flagExpiredUnits) {
    await InventoryService.flagExpiredUnits();
  }

  await loadInventory();

  document.getElementById('bgFilter').addEventListener('change', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);

  const modal = document.getElementById('addUnitModal');
  document.getElementById('addUnitBtn').addEventListener('click', () => { modal.style.display = 'block'; });
  document.getElementById('closeAddModal').addEventListener('click', () => { modal.style.display = 'none'; });

  document.getElementById('addUnitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bgEl = document.getElementById('unitBg');
    const qtyEl = document.getElementById('unitQty');
    const collDateEl = document.getElementById('unitCollDate');
    const expDateEl = document.getElementById('unitExpDate');

    if (Validation && Validation.validateInventoryForm) {
      // Clear previous error
      document.getElementById('formError').style.display = 'none';
      
      const isValid = Validation.validateInventoryForm({
        bloodGroupEl: bgEl, 
        quantityEl: qtyEl, 
        collectionDateEl: collDateEl, 
        expiryDateEl: expDateEl
      });
      
      if (!isValid) {
        document.getElementById('formError').textContent = 'Please fix the errors above.';
        document.getElementById('formError').style.display = 'block';
        return;
      }
    }

    const bg = bgEl.value;
    const qty = parseInt(qtyEl.value, 10);
    const collDate = collDateEl.value;
    const expDate = expDateEl.value;

    if (InventoryService && InventoryService.addUnit) {
      await InventoryService.addUnit({bloodGroup:bg, quantity:qty, collectionDate:collDate, expiryDate:expDate});
      if (RequestService && RequestService.recheckPendingStockRequests) {
        await RequestService.recheckPendingStockRequests();
      }
      modal.style.display = 'none';
      document.getElementById('addUnitForm').reset();
      loadInventory();
      alert('Unit added successfully!');
    }
  });
});

let allInventory = [];

async function loadInventory() {
  allInventory = (await MockData.getAll('bb_blood_inventory'));
  
  // Update summaries
  const bgs = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const summaryCards = document.getElementById('summaryCards');
  summaryCards.innerHTML = bgs.map(bg => {
    const count = allInventory.filter(u => u.bloodGroup === bg && u.unitStatus === 'Available').length;
    return `<div class="bg-card"><h3>${bg}</h3><div class="count">${count} Units</div></div>`;
  }).join('');

  renderTable();
}

function renderTable() {
  const bgFilter = document.getElementById('bgFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  
  let filtered = allInventory.filter(u => {
    const mBg = bgFilter === 'All' || u.bloodGroup === bgFilter;
    const mStatus = statusFilter === 'All' || u.unitStatus === statusFilter;
    return mBg && mStatus;
  });

  filtered.sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  const tbody = document.getElementById('inventoryTable').querySelector('tbody');
  tbody.innerHTML = filtered.map(u => {
    const expDate = new Date(u.expiryDate);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let warn = '';
    if (u.unitStatus === 'Available' && diffDays >= 0 && diffDays <= 7) {
      warn = '<i class="fa-solid fa-triangle-exclamation warning-icon" title="Expiring soon!"></i>';
    }

    let actions = '';
    if (u.unitStatus === 'Available' || u.unitStatus === 'Expired') {
      actions = `<button class="action-btn delete" title="Remove" onclick="removeUnit('${u.unitId}')"><i class="fa-solid fa-trash"></i></button>`;
    }

    return `<tr>
      <td>${u.unitId}</td>
      <td><span class="badge bg-danger">${u.bloodGroup}</span></td>
      <td>${u.quantity}</td>
      <td>${Helpers.formatDate(u.collectionDate)}</td>
      <td>${Helpers.formatDate(u.expiryDate)} ${warn}</td>
      <td>${StatusUtils.unitBadge(u.unitStatus)}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

window.removeUnit = async function(id) {
  if (confirm('Are you sure you want to remove this unit?')) {
    if (InventoryService && InventoryService.removeUnit) {
      await InventoryService.removeUnit(id);
      loadInventory();
    } else {
      let inv = (await MockData.getAll('bb_blood_inventory'));
      inv = inv.filter(u => u.unitId !== id);
      localStorage.setItem('bb_blood_inventory', JSON.stringify(inv));
      loadInventory();
    }
  }
}

