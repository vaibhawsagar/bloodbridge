/**
 * BloodBridge – Request Service (js/services/request-service.js)
 * Manages D7 Blood Request Records.
 * Implements the Blood Request State Machine:
 *   Submitted → CheckingInventory → PendingStock | PendingApproval
 *   PendingApproval → Approved → Fulfilled
 *   Any → Rejected | Cancelled
 *
 * Corresponds to:
 *   BloodRequest class: async submit(), async approve(), async reject()
 *   Sequence Diagram: Blood Request Process
 *   Activity Diagram: Blood Request workflow
 *   Communication Diagram: RequestController interactions
 */

'use strict';

const RequestService = {

  // ─── Read ─────────────────────────────────────────────

  async getAll() {
    return (await MockData.getAll(MockData.STORAGE_KEYS.BLOOD_REQUESTS))
      .sort((a,b) => new Date(b.requestDate) - new Date(a.requestDate));
  },

  async getById(requestId) {
    return await MockData.getById(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId);
  },

  async getByRecipient(recipientId) {
    return this.getAll().filter(r => r.recipientId === recipientId);
  },

  // ─── State Machine Transitions ────────────────────────

  /**
   * async submitRequest() – State: initial → Submitted
   * Recipient submits a blood request.
   * Then immediately processes it (checks inventory).
   */
  async submit({ recipientId, bloodGroup, quantity, urgency, purpose }) {
    const requestId = MockData.generateId('REQ');
    const request = {
      requestId,
      recipientId,
      bloodGroup,
      quantity:      parseInt(quantity, 10),
      urgency,
      purpose,
      requestStatus: StatusUtils.REQUEST_STATUS.SUBMITTED,
      requestDate:   new Date().toISOString().split('T')[0],
      approvalDate:  null,
      rejectionReason: null
    };
    await MockData.add(MockData.STORAGE_KEYS.BLOOD_REQUESTS, request);

    // Notify admin of new request
    const recipients = await MockData.getAll(MockData.STORAGE_KEYS.RECIPIENTS);
    const recipient = recipients.find(r => r.recipientId === recipientId);
    const recipientName = recipient ? recipient.name : recipientId;

    const admins = (await MockData.getAll(MockData.STORAGE_KEYS.USERS)).filter(u => u.role === 'admin');
    admins.forEach(async admin => {
      await NotificationService.sendNewRequestAlert(admin.userId, requestId, recipientName, bloodGroup, quantity, urgency);
    });

    // async processRequest() – State: Submitted → CheckingInventory → PendingApproval | PendingStock
    await this._processRequest(requestId, bloodGroup, quantity);

    return this.getById(requestId);
  },

  /**
   * async processRequest() – State: Submitted → CheckingInventory
   * Checks inventory and transitions to PendingApproval or PendingStock.
   */
  async _processRequest(requestId, bloodGroup, quantity) {
    // Move to CheckingInventory
    await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
      requestStatus: StatusUtils.REQUEST_STATUS.CHECKING_INVENTORY
    });

    const available = await InventoryService.getTotalAvailable(bloodGroup);

    if (available >= quantity) {
      // Stock available → Reserve → PendingApproval
      await InventoryService.reserveUnitsForRequest(bloodGroup, quantity, requestId);
      await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
        requestStatus: StatusUtils.REQUEST_STATUS.PENDING_APPROVAL
      });

      const req = this.getById(requestId);
      const recipient = (await MockData.getAll(MockData.STORAGE_KEYS.RECIPIENTS)).find(r => r.recipientId === req.recipientId);
      if (recipient) {
        await NotificationService.sendRequestStatusUpdate(req.recipientId, requestId, StatusUtils.REQUEST_STATUS.PENDING_APPROVAL, bloodGroup, quantity);
      }
    } else {
      // Insufficient stock → PendingStock
      await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
        requestStatus: StatusUtils.REQUEST_STATUS.PENDING_STOCK
      });

      const req = this.getById(requestId);
      const recipient = (await MockData.getAll(MockData.STORAGE_KEYS.RECIPIENTS)).find(r => r.recipientId === req.recipientId);
      if (recipient) {
        await NotificationService.sendPendingStockNotice(req.recipientId, requestId, bloodGroup, quantity);
      }

      // Notify admin of low stock
      const admins = (await MockData.getAll(MockData.STORAGE_KEYS.USERS)).filter(u => u.role === 'admin');
      admins.forEach(async admin => {
        await NotificationService.sendLowStockAlert(admin.userId, bloodGroup, available);
      });
    }
  },

  /**
   * async stockReplenished() – for PendingStock requests.
   * Re-checks inventory when admin adds new stock.
   */
  async recheckPendingStockRequests() {
    const pending = this.getAll().filter(r => r.requestStatus === StatusUtils.REQUEST_STATUS.PENDING_STOCK);
    pending.forEach(async r => {
      const available = await InventoryService.getTotalAvailable(r.bloodGroup);
      if (available >= r.quantity) {
        await InventoryService.reserveUnitsForRequest(r.bloodGroup, r.quantity, r.requestId);
        await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', r.requestId, {
          requestStatus: StatusUtils.REQUEST_STATUS.PENDING_APPROVAL
        });
        await NotificationService.sendRequestStatusUpdate(r.recipientId, r.requestId, StatusUtils.REQUEST_STATUS.PENDING_APPROVAL, r.bloodGroup, r.quantity);
      }
    });
  },

  /**
   * async approveRequest() – State: PendingApproval → Approved → Fulfilled
   * Admin approves the request and dispatches blood.
   */
  async approve(requestId, adminId) {
    const req = this.getById(requestId);
    if (!req) return null;
    if (req.requestStatus !== StatusUtils.REQUEST_STATUS.PENDING_APPROVAL) return null;

    // Approve
    await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
      requestStatus: StatusUtils.REQUEST_STATUS.APPROVED,
      approvalDate:  new Date().toISOString().split('T')[0]
    });

    const recipient = (await MockData.getAll(MockData.STORAGE_KEYS.RECIPIENTS)).find(r => r.recipientId === req.recipientId);
    const recipientName = recipient ? recipient.name : req.recipientId;

    await ActivityLogService.logRequestApproved(requestId, req.bloodGroup, req.quantity, recipientName);
    await NotificationService.sendRequestStatusUpdate(req.recipientId, requestId, StatusUtils.REQUEST_STATUS.APPROVED, req.bloodGroup, req.quantity);

    // async dispatchBlood() → Fulfilled
    this._dispatchBlood(requestId, req.bloodGroup, req.quantity, req.recipientId, recipientName);

    return this.getById(requestId);
  },

  /**
   * async dispatchBlood() – State: Approved → Fulfilled
   * Issues units and marks request Fulfilled.
   */
  async _dispatchBlood(requestId, bloodGroup, quantity, recipientId, recipientName) {
    await InventoryService.issueUnitsForRequest(requestId, bloodGroup, quantity);

    await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
      requestStatus: StatusUtils.REQUEST_STATUS.FULFILLED
    });

    await ActivityLogService.logBloodIssued(requestId, bloodGroup, quantity, recipientName);
    await NotificationService.sendFulfillmentNotice(recipientId, requestId, bloodGroup, quantity);
  },

  /**
   * async rejectRequest() – State: PendingApproval → Rejected
   * Admin rejects the request; releases reserved units.
   */
  async reject(requestId, adminId, reason = '') {
    const req = this.getById(requestId);
    if (!req) return null;
    if (![StatusUtils.REQUEST_STATUS.PENDING_APPROVAL, StatusUtils.REQUEST_STATUS.PENDING_STOCK].includes(req.requestStatus)) return null;

    await InventoryService.releaseReservedUnits(requestId);

    await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
      requestStatus:    StatusUtils.REQUEST_STATUS.REJECTED,
      approvalDate:     new Date().toISOString().split('T')[0],
      rejectionReason:  reason
    });

    const recipient = (await MockData.getAll(MockData.STORAGE_KEYS.RECIPIENTS)).find(r => r.recipientId === req.recipientId);
    const recipientName = recipient ? recipient.name : req.recipientId;

    await ActivityLogService.logRequestRejected(requestId, req.bloodGroup, req.quantity, recipientName, reason);
    await NotificationService.sendRejectionNotice(req.recipientId, requestId, req.bloodGroup, req.quantity, reason);

    return this.getById(requestId);
  },

  /**
   * async cancelRequest() – State: any cancellable → Cancelled
   */
  async cancel(requestId) {
    const req = this.getById(requestId);
    if (!req) return null;

    const cancellable = [
      StatusUtils.REQUEST_STATUS.SUBMITTED,
      StatusUtils.REQUEST_STATUS.CHECKING_INVENTORY,
      StatusUtils.REQUEST_STATUS.PENDING_STOCK,
      StatusUtils.REQUEST_STATUS.PENDING_APPROVAL
    ];
    if (!cancellable.includes(req.requestStatus)) return null;

    // Release any reserved units
    if (req.requestStatus === StatusUtils.REQUEST_STATUS.PENDING_APPROVAL) {
      await InventoryService.releaseReservedUnits(requestId);
    }

    await MockData.update(MockData.STORAGE_KEYS.BLOOD_REQUESTS, 'requestId', requestId, {
      requestStatus: StatusUtils.REQUEST_STATUS.CANCELLED
    });

    return this.getById(requestId);
  }
};

