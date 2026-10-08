/**
 * BloodBridge – Status Utilities (js/utils/status.js)
 * Centralises all status labels, CSS badge classes, and display helpers.
 * Based on State Machine Diagram and Data Dictionary.
 */

'use strict';

// ─────────────────────────────────────────────
// Request Status Constants (State Machine)
// ─────────────────────────────────────────────
const REQUEST_STATUS = {
  SUBMITTED:         'Submitted',
  CHECKING_INVENTORY:'CheckingInventory',
  PENDING_STOCK:     'PendingStock',
  PENDING_APPROVAL:  'PendingApproval',
  APPROVED:          'Approved',
  REJECTED:          'Rejected',
  FULFILLED:         'Fulfilled',
  CANCELLED:         'Cancelled'
};

// ─────────────────────────────────────────────
// Blood Unit Status Constants
// ─────────────────────────────────────────────
const UNIT_STATUS = {
  AVAILABLE: 'Available',
  RESERVED:  'Reserved',
  ISSUED:    'Issued',
  EXPIRED:   'Expired'
};

// ─────────────────────────────────────────────
// Registration / Approval Status Constants
// ─────────────────────────────────────────────
const REG_STATUS = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

// ─────────────────────────────────────────────
// Badge HTML generators
// ─────────────────────────────────────────────

/**
 * Maps a request status to its CSS badge class name.
 */
function _requestBadgeClass(status) {
  const map = {
    [REQUEST_STATUS.SUBMITTED]:          'badge-submitted',
    [REQUEST_STATUS.CHECKING_INVENTORY]: 'badge-checking',
    [REQUEST_STATUS.PENDING_STOCK]:      'badge-pending-stock',
    [REQUEST_STATUS.PENDING_APPROVAL]:   'badge-pending-approval',
    [REQUEST_STATUS.APPROVED]:           'badge-approved',
    [REQUEST_STATUS.REJECTED]:           'badge-rejected',
    [REQUEST_STATUS.FULFILLED]:          'badge-fulfilled',
    [REQUEST_STATUS.CANCELLED]:          'badge-cancelled'
  };
  return map[status] || 'badge-secondary';
}

/** Human-readable label for request status */
function _requestStatusLabel(status) {
  const map = {
    [REQUEST_STATUS.SUBMITTED]:          'Submitted',
    [REQUEST_STATUS.CHECKING_INVENTORY]: 'Checking Inventory',
    [REQUEST_STATUS.PENDING_STOCK]:      'Pending Stock',
    [REQUEST_STATUS.PENDING_APPROVAL]:   'Pending Approval',
    [REQUEST_STATUS.APPROVED]:           'Approved',
    [REQUEST_STATUS.REJECTED]:           'Rejected',
    [REQUEST_STATUS.FULFILLED]:          'Fulfilled',
    [REQUEST_STATUS.CANCELLED]:          'Cancelled'
  };
  return map[status] || status;
}

/** Returns a full <span> badge for a request status */
function requestBadge(status) {
  return `<span class="badge ${_requestBadgeClass(status)}">${_requestStatusLabel(status)}</span>`;
}

/** Returns a <span> badge for a blood unit status */
function unitBadge(status) {
  const classMap = {
    [UNIT_STATUS.AVAILABLE]: 'badge-available',
    [UNIT_STATUS.RESERVED]:  'badge-reserved',
    [UNIT_STATUS.ISSUED]:    'badge-issued',
    [UNIT_STATUS.EXPIRED]:   'badge-expired'
  };
  const cls = classMap[status] || 'badge-secondary';
  return `<span class="badge ${cls}">${status}</span>`;
}

/** Returns a <span> badge for a registration/approval status */
function regBadge(status) {
  const classMap = {
    [REG_STATUS.PENDING]:  'badge-pending-approval',
    [REG_STATUS.APPROVED]: 'badge-approved',
    [REG_STATUS.REJECTED]: 'badge-rejected'
  };
  const cls = classMap[status] || 'badge-secondary';
  return `<span class="badge ${cls}">${status}</span>`;
}

/** Returns a <span> badge for eligibility status */
function eligibilityBadge(status) {
  const cls = status === 'Eligible' ? 'badge-approved' : 'badge-rejected';
  return `<span class="badge ${cls}">${status}</span>`;
}

/** Returns a <span> badge for urgency level */
function urgencyBadge(urgency) {
  const classMap = {
    'Normal':    'badge-available',
    'Urgent':    'badge-pending-stock',
    'Emergency': 'badge-rejected'
  };
  const cls = classMap[urgency] || 'badge-secondary';
  return `<span class="badge ${cls}">${urgency}</span>`;
}

/** Returns a <span> badge for camp status */
function campBadge(status) {
  const classMap = {
    'Scheduled':  'badge-pending-approval',
    'Completed':  'badge-fulfilled',
    'Cancelled':  'badge-cancelled'
  };
  const cls = classMap[status] || 'badge-secondary';
  return `<span class="badge ${cls}">${status}</span>`;
}

// ─────────────────────────────────────────────
// State Machine – ordered states for tracker UI
// ─────────────────────────────────────────────

/** Returns the ordered list of states for the request tracker. */
function getRequestStateOrder(currentStatus) {
  // Stock-available path
  const normalPath = [
    REQUEST_STATUS.SUBMITTED,
    REQUEST_STATUS.CHECKING_INVENTORY,
    REQUEST_STATUS.PENDING_APPROVAL,
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.FULFILLED
  ];
  // Insufficient-stock path
  const stockPath = [
    REQUEST_STATUS.SUBMITTED,
    REQUEST_STATUS.CHECKING_INVENTORY,
    REQUEST_STATUS.PENDING_STOCK,
    REQUEST_STATUS.PENDING_APPROVAL,
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.FULFILLED
  ];

  const terminal = [REQUEST_STATUS.REJECTED, REQUEST_STATUS.CANCELLED];
  if (terminal.includes(currentStatus)) {
    return normalPath; // show normal path, highlight terminal at end
  }
  if (currentStatus === REQUEST_STATUS.PENDING_STOCK) return stockPath;
  return normalPath;
}

// Public API
const StatusUtils = {
  REQUEST_STATUS,
  UNIT_STATUS,
  REG_STATUS,
  requestBadge,
  unitBadge,
  regBadge,
  eligibilityBadge,
  urgencyBadge,
  campBadge,
  requestStatusLabel: _requestStatusLabel,
  getRequestStateOrder
};
