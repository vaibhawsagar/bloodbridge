/**
 * BloodBridge – Activity Log Service (js/services/activity-log-service.js)
 * Records important system actions per ActivityLog class in Class Diagram.
 * Fulfills SRS §4.2 (security requirement: log all critical actions).
 *
 * ActionTypes:
 *   REGISTRATION_APPROVED | REGISTRATION_REJECTED
 *   INVENTORY_UPDATE | UNIT_STATUS_CHANGED
 *   REQUEST_APPROVED | REQUEST_REJECTED | BLOOD_ISSUED
 *   CAMP_SCHEDULED | CAMP_CANCELLED | CAMP_EDITED
 *   ELIGIBILITY_UPDATED
 */

'use strict';

const ActivityLogService = {

  /** Log an action. Returns the new log entry. */
  log({ actionType, details }) {
    const entry = {
      logId:      MockData.generateId('LOG'),
      actionType,
      timestamp:  new Date().toISOString(),
      details
    };
    MockData.add(MockData.STORAGE_KEYS.ACTIVITY_LOG, entry);
    console.info(`[ActivityLog] ${actionType}: ${details}`);
    return entry;
  },

  /** Get all log entries, most recent first. */
  async getAll() {
    const data = await MockData.getAll(MockData.STORAGE_KEYS.ACTIVITY_LOG) || [];
    return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /** Get the n most recent log entries. */
  async getRecent(n = 50) {
    const all = await this.getAll();
    return all.slice(0, n);
  },

  // ─── Convenience log methods ──────────────────────────

  logRegistrationApproved(donorId, donorName) {
    this.log({ actionType: 'REGISTRATION_APPROVED', details: `Approved donor registration for ${donorId} (${donorName})` });
  },

  logRegistrationRejected(donorId, donorName, reason) {
    this.log({ actionType: 'REGISTRATION_REJECTED', details: `Rejected donor registration for ${donorId} (${donorName})${reason ? ' – ' + reason : ''}` });
  },

  logInventoryUpdate(unitId, bloodGroup, qty, action) {
    this.log({ actionType: 'INVENTORY_UPDATE', details: `${action} unit ${unitId} – ${bloodGroup}, ${qty} unit(s)` });
  },

  logUnitStatusChange(unitId, bloodGroup, oldStatus, newStatus) {
    this.log({ actionType: 'UNIT_STATUS_CHANGED', details: `Unit ${unitId} (${bloodGroup}) status changed: ${oldStatus} → ${newStatus}` });
  },

  logRequestApproved(requestId, bloodGroup, qty, recipientName) {
    this.log({ actionType: 'REQUEST_APPROVED', details: `${requestId} approved – ${qty} unit(s) of ${bloodGroup} for ${recipientName}` });
  },

  logRequestRejected(requestId, bloodGroup, qty, recipientName, reason) {
    this.log({ actionType: 'REQUEST_REJECTED', details: `${requestId} rejected – ${qty} unit(s) of ${bloodGroup} for ${recipientName}. ${reason || ''}` });
  },

  logBloodIssued(requestId, bloodGroup, qty, recipientName) {
    this.log({ actionType: 'BLOOD_ISSUED', details: `Blood dispatched for ${requestId} – ${qty} unit(s) of ${bloodGroup} to ${recipientName}` });
  },

  logCampScheduled(campId, campName, campDate) {
    this.log({ actionType: 'CAMP_SCHEDULED', details: `Camp ${campId} scheduled – ${campName} on ${campDate}` });
  },

  logCampCancelled(campId, campName) {
    this.log({ actionType: 'CAMP_CANCELLED', details: `Camp ${campId} cancelled – ${campName}` });
  },

  logCampEdited(campId, campName) {
    this.log({ actionType: 'CAMP_EDITED', details: `Camp ${campId} details updated – ${campName}` });
  },

  logEligibilityUpdated(criteria) {
    this.log({ actionType: 'ELIGIBILITY_UPDATED', details: `Eligibility criteria updated – minAge:${criteria.minAge}, minWeight:${criteria.minWeight}kg, minHaemoglobin:${criteria.minHaemoglobin}g/dL, minGapDays:${criteria.minGapDays}` });
  }
};
