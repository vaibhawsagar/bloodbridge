/**
 * BloodBridge – Notification Service (js/services/notification-service.js)
 * Manages D8 Notification Records.
 * Simulates SMS/Email external service (Use Case: Send Real-time Notification).
 * In production: replace _deliver() with real SMTP/SMS API calls.
 */

'use strict';

const NotificationService = {

  // ─── Read ─────────────────────────────────────────────

  /**
   * Get all notifications for a given user id + type.
   * recipientType: 'Donor' | 'Recipient' | 'Admin'
   */
  async getForUser(recipientId, recipientType) {
    const data = await MockData.getAll(MockData.STORAGE_KEYS.NOTIFICATIONS) || [];
    return data.filter(n => n.recipientId === recipientId && n.recipientType === recipientType)
      .sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
  },

  /** Count unread notifications for a user */
  async getUnreadCount(recipientId, recipientType) {
    const notifications = await this.getForUser(recipientId, recipientType);
    return notifications.filter(n => n.readStatus === 'Unread').length;
  },

  // ─── Write ────────────────────────────────────────────

  /** Mark a single notification as read */
  async markAsRead(notificationId) {
    await MockData.update(
      MockData.STORAGE_KEYS.NOTIFICATIONS,
      'notificationId',
      notificationId,
      { readStatus: 'Read' }
    );
  },

  /** Mark all notifications for a user as read */
  async markAllAsRead(recipientId, recipientType) {
    const data = await MockData.getAll(MockData.STORAGE_KEYS.NOTIFICATIONS) || [];
    const all = data.map(n => {
      if (n.recipientId === recipientId && n.recipientType === recipientType) {
        return { ...n, readStatus: 'Read' };
      }
      return n;
    });
    MockData.saveAll(MockData.STORAGE_KEYS.NOTIFICATIONS, all);
  },

  // ─── Create ───────────────────────────────────────────

  /**
   * Create and store a new notification.
   * Also "delivers" it (simulated – logs to console; replace with SMTP/SMS).
   */
  create({ recipientId, recipientType, message, type }) {
    const notif = {
      notificationId:      MockData.generateId('NOTIF'),
      recipientId,
      recipientType,
      notificationMessage: message,
      notificationType:    type,       // 'Status Update' | 'Camp Reminder' | 'Eligibility'
      sentDate:            new Date().toISOString().split('T')[0],
      readStatus:          'Unread'
    };
    MockData.add(MockData.STORAGE_KEYS.NOTIFICATIONS, notif);
    this._deliver(notif);
    return notif;
  },

  /** Simulated external delivery (console log; swap for real API) */
  _deliver(notif) {
    console.info(`[BloodBridge Notification] To: ${notif.recipientId} (${notif.recipientType}) | ${notif.notificationType}: ${notif.notificationMessage}`);
  },

  // ─── Convenience creators ─────────────────────────────

  /** R.2.6 / R.3.5: Registration confirmation */
  sendRegistrationConfirmation(userId, roleType, name) {
    this.create({
      recipientId:   userId,
      recipientType: roleType,
      message:       `Welcome, ${name}! Your registration request has been submitted and is pending admin approval.`,
      type:          'Status Update'
    });
  },

  /** Donor registration approved */
  sendDonorRegistrationApproved(donorId, name) {
    this.create({
      recipientId:   donorId,
      recipientType: 'Donor',
      message:       `Your donor registration has been approved. You are now eligible to donate blood at BloodBridge!`,
      type:          'Status Update'
    });
  },

  /** Donor registration rejected */
  sendDonorRegistrationRejected(donorId, name, reason) {
    this.create({
      recipientId:   donorId,
      recipientType: 'Donor',
      message:       `Your donor registration has been rejected. ${reason ? 'Reason: ' + reason : 'Please contact the blood bank for details.'}`,
      type:          'Status Update'
    });
  },

  /** R.3.5: Blood request status update to recipient */
  sendRequestStatusUpdate(recipientId, requestId, status, bloodGroup, quantity) {
    const label = StatusUtils ? StatusUtils.requestStatusLabel(status) : status;
    this.create({
      recipientId,
      recipientType: 'Recipient',
      message:       `Your blood request ${requestId} for ${quantity} unit(s) of ${bloodGroup} is now: ${label}.`,
      type:          'Status Update'
    });
  },

  /** Insufficient stock alert – to admin */
  sendLowStockAlert(adminId, bloodGroup, available) {
    this.create({
      recipientId:   adminId,
      recipientType: 'Admin',
      message:       `Low stock alert: ${bloodGroup} has only ${available} available unit(s). Please arrange replenishment.`,
      type:          'Status Update'
    });
  },

  /** New blood request alert – to admin */
  sendNewRequestAlert(adminId, requestId, recipientName, bloodGroup, quantity, urgency) {
    this.create({
      recipientId:   adminId,
      recipientType: 'Admin',
      message:       `New blood request ${requestId} by ${recipientName} – ${quantity} unit(s) of ${bloodGroup} | Urgency: ${urgency}. Awaiting your review.`,
      type:          'Status Update'
    });
  },

  /** Camp reminder to a donor */
  sendCampReminder(donorId, campName, campDate) {
    this.create({
      recipientId:   donorId,
      recipientType: 'Donor',
      message:       `Reminder: ${campName} is scheduled on ${campDate}. You are registered for this camp. Thank you for your commitment!`,
      type:          'Camp Reminder'
    });
  },

  /** Donation acknowledgement */
  sendDonationAck(donorId, donationDate, certNumber) {
    this.create({
      recipientId:   donorId,
      recipientType: 'Donor',
      message:       `Thank you for your donation on ${donationDate}! Your certificate (${certNumber}) is available for download.`,
      type:          'Status Update'
    });
  },

  /** Rejection notice to recipient */
  sendRejectionNotice(recipientId, requestId, bloodGroup, quantity, reason) {
    this.create({
      recipientId,
      recipientType: 'Recipient',
      message:       `Your blood request ${requestId} for ${quantity} unit(s) of ${bloodGroup} has been rejected. ${reason ? 'Reason: ' + reason : ''}`,
      type:          'Status Update'
    });
  },

  /** Approval/fulfillment notice to recipient */
  sendFulfillmentNotice(recipientId, requestId, bloodGroup, quantity) {
    this.create({
      recipientId,
      recipientType: 'Recipient',
      message:       `Your blood request ${requestId} for ${quantity} unit(s) of ${bloodGroup} has been fulfilled. Blood units have been dispatched.`,
      type:          'Status Update'
    });
  },

  /** Pending stock notice to recipient */
  sendPendingStockNotice(recipientId, requestId, bloodGroup, quantity) {
    this.create({
      recipientId,
      recipientType: 'Recipient',
      message:       `Insufficient ${bloodGroup} stock: Your request ${requestId} for ${quantity} unit(s) has been flagged as Pending Stock. We will notify you once stock is replenished.`,
      type:          'Status Update'
    });
  }
};
